# AI Chat Bot untuk InJourney Airport

Aplikasi chat AI yang terintegrasi dengan sistem RAG (Retrieval-Augmented Generation) untuk membantu karyawan InJourney Airport menemukan informasi dari dokumen internal.

## 🚀 Fitur Utama

- **Multi-AI Support**: Gemini AI dan Deepseek AI
- **Document Processing**: Upload dan proses PDF, DOCX, CSV, TXT
- **RAG System**: Python-based dengan FAISS vector store
- **Vector Search**: Pencarian konteks relevan dari dokumen
- **Modern UI**: Interface yang responsif dan user-friendly

## 🛠️ Setup & Konfigurasi

### Prerequisites
- Node.js (v16+)
- Python 3.8+
- Ollama (untuk Deepseek local)

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install

# Python RAG dependencies
cd ../python_rag_ingestion
pip install -r requirements.txt
```

### 2. Konfigurasi AI (Internal)

Edit file `config/ai-config.ts` untuk mengatur API keys dan URL:

```typescript
export const AI_CONFIG = {
  GEMINI: {
    API_KEY: 'YOUR_GEMINI_API_KEY_HERE', // Ganti dengan API key Anda
    MODEL: 'gemini-1.5-flash',
  },
  
  DEEPSEEK: {
    URL: 'http://127.0.0.1:11434', // URL Ollama local
    MODEL: 'deepseek-coder:6.7b',
    EMBED_MODEL: 'deepseek-embed',
  },
  
  DEFAULT_MODEL: 'gemini',
};
```

### 3. Setup Database

```bash
cd server
npx prisma generate
npx prisma db push
```

### 4. Run Application

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
npm run dev
```

## 🔧 Penggunaan

1. **Upload Dokumen**: Klik tombol upload untuk menambahkan dokumen
2. **Pilih AI Model**: Buka settings untuk memilih antara Gemini atau Deepseek
3. **Chat**: Mulai percakapan dan AI akan mencari konteks relevan dari dokumen
4. **Test Koneksi**: Gunakan tombol "Test Koneksi" di settings untuk memverifikasi

## 📁 Struktur Project

```
├── components/          # React components
├── services/           # AI service integrations
├── server/            # Backend API & database
├── python_rag_ingestion/  # RAG system
├── config/            # Internal configuration
└── types.ts           # TypeScript types
```

## 🔒 Keamanan

- API keys dan URL disimpan secara internal di `config/ai-config.ts`
- Tidak ada input API key di UI untuk keamanan
- Konfigurasi dapat diubah hanya melalui file konfigurasi

## 🐛 Troubleshooting

- **Gemini Error**: Pastikan API key valid di `config/ai-config.ts`
- **Deepseek Error**: Pastikan Ollama berjalan dan model terinstall
- **RAG Error**: Pastikan Python dependencies terinstall dengan benar
