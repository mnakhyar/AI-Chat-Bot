
import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';
import { Document } from '../types'; // Assuming Document type is still relevant for context passing

const DEFAULT_GEMINI_KEY = 'YOUR_GEMINI_API_KEY'; // Placeholder - user should replace this

let geminiApiKey: string | null = DEFAULT_GEMINI_KEY;
let ai: GoogleGenerativeAI | null = new GoogleGenerativeAI(DEFAULT_GEMINI_KEY);

export function setGeminiApiKey(key: string) {
  console.log('[Gemini] set key', key.slice(0,6)+'***');
  geminiApiKey = key;
  ai = new GoogleGenerativeAI(key);
}

export function isGeminiConfigured() {
  return !!geminiApiKey && geminiApiKey !== DEFAULT_GEMINI_KEY;
}

const SYSTEM_INSTRUCTION = `Anda adalah asisten AI internal yang profesional, akurat, dan sangat terpercaya untuk InJourney Airports. Nama Anda adalah 'InJourney Airport AI'.

Tujuan utama Anda adalah membantu karyawan menemukan informasi spesifik HANYA dari dalam dokumen yang disediakan dalam konteks.

Gunakan bahasa Indonesia yang formal, jelas, dan lugas.

Format respons Anda menggunakan Markdown untuk kejelasan (misalnya, heading, tebal, miring, dan daftar berpoin/bernomor) jika diperlukan untuk menyajikan informasi secara efektif. Gunakan heading (#, ##), bold (**text**), italic (*text*), dan list (-, *).

Selalu jawab pertanyaan HANYA berdasarkan fakta yang ada di dalam dokumen yang diberikan.

JANGAN membuat spekulasi atau memberikan informasi dari luar konteks dokumen.

Jika informasi yang ditanyakan tidak ditemukan dalam dokumen yang diberikan, nyatakan dengan jujur dan sopan bahwa informasi tersebut tidak tersedia. Contoh respons: 'Maaf, saya tidak dapat menemukan informasi mengenai hal tersebut di dalam dokumen yang tersedia.'

JANGAN menyebutkan bahwa Anda adalah model bahasa atau AI. Bertindaklah sebagai asisten internal 'InJourney Airport AI'.`;

const chatSessions = new Map<string, any>();

function getChatSession(chatId: string) {
  if (!ai) { console.error('[Gemini] AI belum diinisialisasi'); }
  const MODEL_NAME = 'gemini-2.0-flash'; // use flash variant as requested
  console.log('[Gemini] getChatSession', { chatId, model: MODEL_NAME });
  if (chatSessions.has(chatId)) return chatSessions.get(chatId)!;

  const model = ai!.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_INSTRUCTION
  });
  const chat = model.startChat({
    // systemInstruction moved to getGenerativeModel
  });
  chatSessions.set(chatId, chat);
  return chat;
}

export const GeminiService = {
  sendMessage: async (chatId: string, message: string, documents: Document[]): Promise<string> => {
    try {
      const chat = getChatSession(chatId);
      // The context retrieval is now handled by the backend's /api/rag/context endpoint
      // So, the documents parameter here is likely just for compatibility or could be removed if not used to construct prompt locally
      
      // For now, assuming direct message passing, as context will be fetched by App.tsx
      const result: GenerateContentResult = await chat.sendMessage(message);
      console.log('[Gemini] raw response', result);
      return result.response.text();
    } catch (error) {
      console.error("Error sending message to Gemini:", error);
      if (error instanceof Error && error.message.includes('token')) {
        return "Terjadi kesalahan: Ukuran permintaan terlalu besar bahkan setelah mencoba mengambil konteks yang relevan. Coba sederhanakan pertanyaan Anda atau unggah dokumen yang lebih kecil.";
      }
      return "Terjadi kesalahan saat berkomunikasi dengan AI. Silakan coba lagi.";
    }
  },
};