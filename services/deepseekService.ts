import { Document } from '../types';

// Konfigurasi untuk Deepseek API
let baseUrl = 'http://10.20.42.214:11434';
export function setDeepseekUrl(url:string){baseUrl=url;}
const DEEPSEEK_API_URL = () => `${baseUrl}/api/chat`;

const SYSTEM_INSTRUCTION = `Anda adalah asisten AI internal yang profesional, akurat, dan sangat terpercaya untuk InJourney Airports. Nama Anda adalah 'InJourney Airport AI'.
Tujuan utama Anda adalah membantu karyawan menemukan informasi spesifik HANYA dari dalam dokumen yang disediakan dalam konteks.
WAJIB Gunakan bahasa Indonesia yang formal, jelas, dan lugas.
Format respons Anda menggunakan Markdown untuk kejelasan (misalnya, heading, tebal, miring, dan daftar berpoin/bernomor) jika diperlukan untuk menyajikan informasi secara efektif. Gunakan heading (#, ##), bold (**text**), italic (*text*), dan list (-, *).
Selalu jawab pertanyaan HANYA berdasarkan fakta yang ada di dalam dokumen yang diberikan.
JANGAN membuat spekulasi atau memberikan informasi dari luar konteks dokumen.
Jika informasi yang ditanyakan tidak ditemukan dalam dokumen yang diberikan, nyatakan dengan jujur dan sopan bahwa informasi tersebut tidak tersedia. Contoh respons: 'Maaf, saya tidak dapat menemukan informasi mengenai hal tersebut di dalam dokumen yang tersedia.'
JANGAN menyebutkan bahwa Anda adalah model bahasa atau AI. Bertindaklah sebagai asisten internal 'InJourney Airport AI'.`;

// Menyimpan sesi chat
const chatSessions = new Map<string, string[]>();

/**
 * Finds the most relevant document chunks based on keyword matching with the user's message.
 */
function getRelevantContext(userMessage: string, documents: Document[]): string {
    if (documents.length === 0) {
        return "";
    }

    const allChunks: { content: string; name: string; score: number }[] = [];
    documents.forEach(doc => {
        doc.chunks.forEach(chunk => {
            allChunks.push({ content: chunk, name: doc.name, score: 0 });
        });
    });

    const queryWords = userMessage.toLowerCase().match(/\b(\w+)\b/g) || [];
    const uniqueQueryWords = [...new Set(queryWords)];
    
    if (uniqueQueryWords.length > 0) {
        allChunks.forEach(chunk => {
            const chunkTextLower = chunk.content.toLowerCase();
            let score = 0;
            uniqueQueryWords.forEach(word => {
                if (chunkTextLower.includes(word)) {
                    score++;
                }
            });
            chunk.score = score;
        });
    }

    const sortedChunks = allChunks.filter(c => c.score > 0).sort((a, b) => b.score - a.score);
    const CONTEXT_CHAR_LIMIT = 8000;
    const MAX_CHUNKS = 10;
    
    let context = "";
    let currentChars = 0;
    const addedChunks = new Set<string>();

    for (let i = 0; i < Math.min(sortedChunks.length, MAX_CHUNKS); i++) {
        const chunk = sortedChunks[i];
        if (addedChunks.has(chunk.content)) continue;

        const chunkContext = `--- DOKUMEN: ${chunk.name} ---\n${chunk.content}\n\n`;
        if (currentChars + chunkContext.length > CONTEXT_CHAR_LIMIT) {
            break;
        }

        context += chunkContext;
        currentChars += chunkContext.length;
        addedChunks.add(chunk.content);
    }
    
    return context;
}

function constructPrompt(userMessage: string, documents: Document[]): string {
    const relevantContext = getRelevantContext(userMessage, documents);

    if (!relevantContext) {
        return userMessage;
    }

    return `KONTEKS DARI DOKUMEN YANG DIUNGGAH:
${relevantContext}
--- AKHIR DARI KONTEKS DOKUMEN ---

Berdasarkan HANYA pada konteks di atas, jawab pertanyaan berikut:
"${userMessage}"`;
}

async function sendToDeepseek(messages: string[]): Promise<string> {
    try {
        const formattedMessages = messages.map((content, index) => ({
            role: index === 0 ? "system" : "user",
            content: content
        }));
        
        const response = await fetch(DEEPSEEK_API_URL(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "deepseek-r1:7b",
                messages: formattedMessages,
                stream: false  // Request a single JSON response instead of a streaming NDJSON response
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data && data.message && data.message.content) {
            return data.message.content;
        }
        return "Maaf, terjadi kesalahan dalam memproses respons dari AI.";
    } catch (error) {
        console.error('Error calling Deepseek API:', error);
        throw error;
    }
}

export const DeepseekService = {
    sendMessage: async (chatId: string, message: string, documents: Document[]): Promise<string> => {
        try {
            // Get or initialize chat history
            if (!chatSessions.has(chatId)) {
                chatSessions.set(chatId, [SYSTEM_INSTRUCTION]);
            }
            const chatHistory = chatSessions.get(chatId)!;

            // Construct the prompt with context
            const fullPrompt = constructPrompt(message, documents);
            
            // Add user message to history
            chatHistory.push(fullPrompt);

            // Send to Deepseek API
            const response = await sendToDeepseek(chatHistory);

            // Add assistant response to history
            chatHistory.push(response);

            // Trim history if it gets too long (keep last N messages)
            if (chatHistory.length > 10) {
                chatHistory.splice(1, 2); // Remove oldest Q&A pair, keep system instruction
            }

            return response;
        } catch (error) {
            console.error("Error sending message to Deepseek:", error);
            if (error instanceof Error && error.message.includes('token')) {
                return "Terjadi kesalahan: Ukuran permintaan terlalu besar bahkan setelah mencoba mengambil konteks yang relevan. Coba sederhanakan pertanyaan Anda atau unggah dokumen yang lebih kecil.";
            }
            return "Terjadi kesalahan saat berkomunikasi dengan AI. Silakan coba lagi.";
        }
    },
};
