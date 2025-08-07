import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs'; // Node.js File System module
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, Document } from '@prisma/client'; // Import Document type

// --- Konfigurasi ---
const DEEPSEEK_EMBED_URL = process.env.DEEPSEEK_EMBED_URL || 'http://127.0.0.1:11434/api/embed';
const PORT = process.env.PORT || 3001;
const PYTHON_EXECUTABLE = 'C:\\Users\\M Nimazuddin Akhyar\\AppData\\Local\\Programs\\Python\\Python310\\python.exe';

// Paths
const PYTHON_RAG_DIR = path.join(__dirname, '..', '..', 'python_rag_ingestion');
const PYTHON_INGEST_SCRIPT = path.join(PYTHON_RAG_DIR, 'ingest.py');
const PYTHON_QUERY_SCRIPT = path.join(PYTHON_RAG_DIR, 'query_rag.py'); // Skrip Python baru untuk query
const UPLOAD_DIR = path.join(PYTHON_RAG_DIR, 'data');

// Pastikan direktori upload ada
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// --- Inisialisasi ---
const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const prisma = new PrismaClient();

// --- Middleware ---
// Strengthen CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());

// --- Fungsi Helper (tetap relevan jika Deepseek API digunakan untuk tujuan lain)

/**
 * Memanggil API embedding Deepseek eksternal.
 * (Fungsi ini mungkin tidak lagi sepenuhnya digunakan jika ingestion Python mengurus embedding secara lokal)
 */
async function embedTexts(texts: string[]): Promise<number[][]> {
    try {
        const response = await fetch(DEEPSEEK_EMBED_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'deepseek-embed', // atau model embedding lain yang Anda gunakan
                input: texts,
                stream: false,
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to embed text. Status: ${response.status}, Body: ${errorBody}`);
        }
        const data = await response.json();
        return data.embeddings || (data.embedding ? [data.embedding] : []);
    } catch (error) {
        console.error("Error calling embedding API:", error);
        throw error;
    }
}

// --- Rute API ---

/**
 * Endpoint untuk mengunggah, menyimpan file, dan memicu proses ingestion Python.
 */
app.post('/api/documents', upload.single('file'), async (req, res) => {
    console.log(`[API /documents] Received upload request for file: ${req.file?.originalname}`);
    if (!req.file) {
        console.error('[API /documents] No file uploaded.');
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const documentId = uuidv4();
    const originalFileName = req.file.originalname;
    const fileExtension = path.extname(originalFileName);
    const fileName = `${documentId}${fileExtension}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    try {
        // Simpan file yang diunggah ke disk
        fs.writeFileSync(filePath, req.file.buffer);
        console.log(`[API /documents] File saved to: ${filePath}`);

        // Panggil skrip Python untuk ingestion
        // Asumsi skrip Python ingest.py sekarang bisa menerima satu path file sebagai argumen
        const pythonCommand = `"${PYTHON_EXECUTABLE}" "${PYTHON_INGEST_SCRIPT}"`;
        console.log(`[API /documents] Executing Python ingestion: ${pythonCommand}`);

        exec(pythonCommand, { cwd: PYTHON_RAG_DIR, env: { ...process.env, FILE_PATH: filePath } }, async (error, stdout, stderr) => {
            if (error) {
                console.error(`[Python Ingestion ERROR] exec error: ${error}`);
                console.error(`[Python Ingestion ERROR] stdout: ${stdout}`);
                console.error(`[Python Ingestion ERROR] stderr: ${stderr}`);
                fs.unlinkSync(filePath); // Hapus file yang diupload jika ingestion gagal
                return res.status(500).json({ error: 'Failed to ingest document via Python.', details: stderr });
            }
            console.log(`[Python Ingestion SUCCESS] stdout: ${stdout}`);
            if (stderr) {
                console.warn(`[Python Ingestion WARN] stderr: ${stderr}`);
            }

            // Simpan metadata dokumen
            const newDocumentMetadata = {
                id: documentId,
                name: originalFileName,
                originalPath: filePath, // Add originalPath
                vectorStorePath: path.join(PYTHON_RAG_DIR, 'faiss_index_rag'), // Add vectorStorePath
                createdAt: new Date(),
            };
            await prisma.document.create({ data: newDocumentMetadata });

            res.status(201).json({
                id: newDocumentMetadata.id,
                name: newDocumentMetadata.name,
                message: 'Document successfully submitted for Python ingestion.',
            });
        });

    } catch (error: any) {
        console.error('Error uploading document to Python pipeline:', error);
        res.status(500).json({ error: 'Failed to upload document.', details: error.message });
    }
});

/**
 * Endpoint untuk mengambil semua dokumen (metadata).
 */
app.get('/api/documents', async (req, res) => {
    try {
        // const sortedDocuments = [...documentsMetadata].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Removed in-memory storage
        // res.json(sortedDocuments);
        const documents = await prisma.document.findMany({
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(documents);
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

/**
 * Endpoint untuk menghapus dokumen dan semua chunk-nya (termasuk file aslinya).
 */
app.delete('/api/documents/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const documentToDelete: Document | null = await prisma.document.findUnique({
            where: { id },
        });

        if (!documentToDelete) {
            return res.status(404).json({ error: 'Document not found' });
        }
        
        // Hapus file asli yang diupload
        if (fs.existsSync(documentToDelete.originalPath)) {
            fs.unlinkSync(documentToDelete.originalPath);
            console.log(`[API /documents] Deleted original file: ${documentToDelete.originalPath}`);
        }

        // Hapus metadata dokumen dari database
        await prisma.document.delete({
            where: { id },
        });

        console.log(`Deleted document metadata for ${id}.`);
        res.status(204).send(); // No Content
    } catch (error) {
        console.error(`Error deleting document ${id}:`, error);
        res.status(500).json({ error: `Failed to delete document ${id}` });
    }
});

/**
 * Endpoint utama untuk RAG. Menerima query, mencari konteks, dan mengembalikannya.
 * Sekarang akan memuat FAISS index dan melakukan pencarian menggunakan Python.
 */
app.post('/api/rag/context', async (req, res) => {
    const { query, documentIds } = req.body;

    if (!query || !Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ error: 'Query and documentIds array are required.' });
    }

    try {
        // Panggil skrip Python untuk melakukan RAG query
        // Asumsi skrip Python query_rag.py menerima query dan documentIds sebagai JSON string argumen
        const queryPayload = JSON.stringify({ query, documentIds });
        const pythonCommand = `"${PYTHON_EXECUTABLE}" "${PYTHON_QUERY_SCRIPT}"`;
        console.log(`[API /rag/context] Executing Python query: ${pythonCommand}`);

        exec(pythonCommand, { cwd: PYTHON_RAG_DIR, env: { ...process.env, QUERY_PAYLOAD: queryPayload } }, (error, stdout, stderr) => {
            if (error) {
                console.error(`[Python Query ERROR] exec error: ${error}`);
                console.error(`[Python Query ERROR] stdout: ${stdout}`);
                console.error(`[Python Query ERROR] stderr: ${stderr}`);
                return res.status(500).json({ error: 'Failed to retrieve context via Python.', details: stderr });
            }
            console.log(`[Python Query SUCCESS] stdout: ${stdout}`);
            if (stderr) {
                console.warn(`[Python Query WARN] stderr: ${stderr}`);
            }

            try {
                const pythonOutput = JSON.parse(stdout);
                const context = pythonOutput.context || '';
                res.json({ context });
            } catch (parseError: any) {
                console.error(`[Python Query ERROR] Failed to parse Python output: ${parseError.message}`);
                return res.status(500).json({ error: 'Failed to parse Python response.', details: parseError.message });
            }
        });

    } catch (error: any) {
        console.error('Error in RAG context retrieval:', error);
        res.status(500).json({ error: 'Failed to retrieve context.', details: error.message });
    }
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});