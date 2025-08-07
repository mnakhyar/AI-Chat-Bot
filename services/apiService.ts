import { Document, ChatSession, Message } from '../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Baca dari env agar mudah diganti saat hendak di-hosting / diakses via IP jaringan
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
console.log('API Base URL:', API_BASE_URL);

/**
 * Mengunggah file ke backend untuk diproses.
 * @param file File yang akan diunggah.
 * @returns Respon dari server, termasuk ID dan nama dokumen.
 */
export async function uploadDocument(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to upload document.');
    }

    return response.json();
}

/**
 * Mengambil daftar semua dokumen dari server.
 */
export async function getDocuments() {
    const response = await fetch(`${API_BASE_URL}/documents`);
    if (!response.ok) {
        throw new Error('Failed to fetch documents.');
    }
    return response.json();
}

/**
 * Menghapus dokumen berdasarkan ID-nya.
 * @param id ID dokumen yang akan dihapus.
 */
export async function deleteDocument(id: string) {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error('Failed to delete document.');
    }
    // Tidak ada body pada respons 204
}

/**
 * Mendapatkan konteks yang relevan dari backend untuk query tertentu.
 * @param query Pertanyaan dari pengguna.
 * @param documentIds Array ID dokumen yang akan dicari.
 * @returns String konteks yang relevan.
 */
export async function getContextForRag(query: string, documentIds: string[]): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/rag/context`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, documentIds }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to retrieve context.');
    }

    const data = await response.json();
    return data.context;
}

export const ChatService = {
  // Buat chat session baru
  createChat: async (title: string): Promise<ChatSession> => {
    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error('Failed to create chat');
    }

    return response.json();
  },

  // Tambah pesan ke chat
  addMessage: async (chatId: string, role: string, content: string): Promise<Message> => {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role, content }),
    });

    if (!response.ok) {
      throw new Error('Failed to add message');
    }

    return response.json();
  },

  // Ambil semua chat
  getAllChats: async (): Promise<ChatSession[]> => {
    const response = await fetch(`${API_BASE_URL}/chats`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }

    return response.json();
  },
};
