
import React, { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import SettingsModal from './components/SettingsModal';
import { GeminiService, setGeminiApiKey, isGeminiConfigured } from './services/geminiService';
import { DeepseekService, setDeepseekUrl } from './services/deepseekService';
import * as apiService from './services/apiService';
import { ChatSession, Document, Message, Role } from './types';
import { AI_CONFIG, getCurrentModelConfig } from './config/ai-config';
import { githubActionsService } from './services/githubActionsService';

type Settings = {
  model: 'gemini' | 'deepseek';
  githubActions?: {
    enabled: boolean;
    autoDeploy: boolean;
    testOnPush: boolean;
  };
};

const App: React.FC = () => {
  // State Hooks
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('injourney-settings');
    return saved ? JSON.parse(saved) : { 
      model: AI_CONFIG.DEFAULT_MODEL,
      githubActions: {
        enabled: false,
        autoDeploy: false,
        testOnPush: true,
      }
    };
  });

  // --- Effects ---

  // Load documents from server on initial mount
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const serverDocs = await apiService.getDocuments();
        setDocuments(serverDocs);
      } catch (error) {
        console.error("Failed to fetch documents from server:", error);
        setNotification('Gagal memuat dokumen dari server.');
      }
    };
    fetchDocuments();
  }, []);

  // Persist settings to localStorage and setup AI services
  useEffect(() => {
    localStorage.setItem('injourney-settings', JSON.stringify(settings));
    
    // Setup AI services with internal configuration
    const config = getCurrentModelConfig(settings.model);
    if (settings.model === 'gemini') {
      setGeminiApiKey(AI_CONFIG.GEMINI.API_KEY);
    } else if (settings.model === 'deepseek') {
      setDeepseekUrl(AI_CONFIG.DEEPSEEK.URL);
    }

    // Update GitHub Actions configuration
    if (settings.githubActions) {
      githubActionsService.updateConfig(settings.githubActions);
    }
  }, [settings]);

  // Notification timeout
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // --- Handlers ---

  const handleNewChat = () => {
    const newChat: ChatSession = {
      id: nanoid(),
      title: 'Percakapan Baru',
      messages: [],
      createdAt: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const handleUploadDocument = async (file: File) => {
    setIsLoading(true);
    setNotification(`Mengunggah ${file.name}...`);
    try {
      const newDoc = await apiService.uploadDocument(file);
      setDocuments(prev => [newDoc, ...prev]);
      setNotification(`Dokumen "${file.name}" berhasil diunggah.`);
    } catch (error: any) {
      console.error("Upload failed:", error);
      setNotification(`Gagal mengunggah: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) {
      try {
        await apiService.deleteDocument(id);
        setDocuments(prev => prev.filter(doc => doc.id !== id));
        setNotification('Dokumen berhasil dihapus.');
      } catch (error) {
        console.error("Delete failed:", error);
        setNotification('Gagal menghapus dokumen.');
      }
    }
  };

  const handleSendMessage = async (messageText: string) => {
    let currentChatId = activeChatId;
    if (!currentChatId) {
      const newChat = { id: nanoid(), title: messageText.substring(0, 30) + '...', messages: [], createdAt: new Date() };
      setChats(prev => [newChat, ...prev]);
      currentChatId = newChat.id;
      setActiveChatId(newChat.id);
    }

    const userMessage: Message = { id: nanoid(), role: Role.USER, text: messageText };
    setChats(prev => prev.map(chat =>
      chat.id === currentChatId ? { ...chat, messages: [...chat.messages, userMessage] } : chat
    ));

    setIsLoading(true);

    try {
      // 1. Get relevant context from RAG backend
      const documentIds = documents.map(doc => doc.id);
      let context = '';
      if (documentIds.length > 0) {
        setNotification('Mencari konteks relevan...');
        context = await apiService.getContextForRag(messageText, documentIds);
        setNotification(context ? 'Konteks ditemukan, menghubungi AI...' : 'Tidak ada konteks relevan, menghubungi AI...');
      }

      const fullPrompt = context
        ? `Berdasarkan HANYA pada konteks berikut:\n\n---\n${context}\n---\n\nJawab pertanyaan: "${messageText}"`
        : messageText;

      // 2. Send to the selected AI model
      let responseText = '';
      if (settings.model === 'deepseek') {
        responseText = await DeepseekService.sendMessage(currentChatId, fullPrompt, []); // Pass empty docs array
      } else {
        responseText = await GeminiService.sendMessage(currentChatId, fullPrompt, []); // Pass empty docs array
      }
      
      const modelMessage: Message = { id: nanoid(), role: Role.MODEL, text: responseText };
      setChats(prev => prev.map(chat =>
        chat.id === currentChatId ? { ...chat, messages: [...chat.messages, modelMessage] } : chat
      ));

    } catch (error: any) {
      console.error("Failed to get response:", error);
      const errorMessage = { id: nanoid(), role: Role.MODEL, text: `Error: ${error.message}` };
      setChats(prev => prev.map(chat =>
        chat.id === currentChatId ? { ...chat, messages: [...chat.messages, errorMessage] } : chat
      ));
    } finally {
      setIsLoading(false);
      setNotification(null);
    }
  };

  const testConnection = async (cfg: Settings): Promise<boolean> => {
    try {
      if (cfg.model === 'deepseek') {
        // Test Deepseek connection using internal config
        const res = await fetch(`${AI_CONFIG.DEEPSEEK.URL}/api/tags`);
        return res.ok;
      } else {
        // Test Gemini connection using internal config
        setGeminiApiKey(AI_CONFIG.GEMINI.API_KEY);
        return isGeminiConfigured();
      }
    } catch {
      return false;
    }
  };

  // --- Render ---
  
  const activeChat = chats.find(c => c.id === activeChatId) || null;

  return (
    <div className="flex h-screen font-sans bg-injourney-bg-light overflow-hidden">
      {notification && (
        <div className="absolute top-5 right-5 bg-injourney-accent text-white py-2 px-4 rounded-lg shadow-lg z-50 animate-fade-in-out">
          {notification}
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-80 flex-shrink-0">
        <Sidebar 
          chats={chats}
          documents={documents}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onSelectChat={setActiveChatId}
          onUploadDocument={handleUploadDocument}
          onClearDocuments={()=>{/* Logic to be implemented if needed */}}
          onDeleteChat={(id) => setChats(prev => prev.filter(c => c.id !== id))}
          onDeleteDocument={handleDeleteDocument}
          onSettingsClick={() => setShowSettings(true)}
        />
      </div>
      
      {/* Mobile Sidebar */}
      <div className={`md:hidden fixed inset-0 z-30 transition-opacity ${isSidebarOpen ? 'bg-black/50' : 'pointer-events-none opacity-0'}`} onClick={() => setIsSidebarOpen(false)}></div>
      <div className={`md:hidden fixed top-0 left-0 h-full w-80 bg-white z-40 transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          chats={chats}
          documents={documents}
          activeChatId={activeChatId}
          onNewChat={handleNewChat}
          onSelectChat={setActiveChatId}
          onUploadDocument={handleUploadDocument}
          onClearDocuments={()=>{/* Logic to be implemented if needed */}}
          onDeleteChat={(id) => setChats(prev => prev.filter(c => c.id !== id))}
          onDeleteDocument={handleDeleteDocument}
          onSettingsClick={() => setShowSettings(true)}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      <main className="flex-1 flex flex-col min-w-0">
        <ChatView 
          chat={activeChat}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
      </main>

      <SettingsModal 
        show={showSettings}
        initial={settings}
        onSave={(s)=>{setSettings(s); setShowSettings(false);}}
        onClose={()=>setShowSettings(false)}
        onTest={testConnection}
      />
    </div>
  );
};

export default App;