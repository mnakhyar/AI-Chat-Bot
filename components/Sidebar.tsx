
import React, { useRef } from 'react';
import { ChatSession, Document } from '../types';
import { 
  InJourneyLogo, PlusIcon, UploadIcon, ChatIcon, MenuIcon, CloseIcon,
  TrashIcon, SettingsIcon
} from './Icons';

interface SidebarProps {
  chats: ChatSession[];
  documents: Document[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onUploadDocument: (file: File) => void;
  onClearDocuments: () => void;
  onDeleteChat: (id: string) => void;
  onDeleteDocument: (id: string) => void;
  onSettingsClick: () => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  chats, documents, activeChatId, onNewChat, onSelectChat, onUploadDocument, onClearDocuments,
  onDeleteChat, onDeleteDocument, onClose, onSettingsClick 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onUploadDocument(event.target.files[0]);
      // Reset file input
      if(fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white h-full w-full flex flex-col shadow-lg">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <InJourneyLogo className="h-8 w-auto" />
            <span className="font-bold text-lg text-injourney-text-dark">Airport AI</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <CloseIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="flex-grow p-4 overflow-y-auto">
        <button 
          onClick={onNewChat} 
          className="w-full flex items-center justify-center gap-2 bg-injourney-accent hover:bg-injourney-accent-dark text-white font-bold py-2 px-4 rounded-lg mb-4"
        >
          <PlusIcon className="w-5 h-5" />
          Percakapan Baru
        </button>
        
        {/* Chat History */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">RIWAYAT</h3>
          <div className="flex-grow overflow-y-auto pr-2">
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`flex items-center justify-between group text-sm rounded-md p-2 my-1 cursor-pointer truncate ${activeChatId === chat.id ? 'bg-injourney-accent text-white' : 'hover:bg-gray-200'}`}
              >
                <div onClick={() => onSelectChat(chat.id)} className="flex items-center gap-2 flex-grow min-w-0">
                  <ChatIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{chat.title}</span>
                </div>
                <button 
                  onClick={() => onDeleteChat(chat.id)} 
                  className={`ml-2 p-1 rounded-full ${activeChatId === chat.id ? 'text-white hover:bg-white/20' : 'text-gray-400 hover:bg-gray-300'} opacity-0 group-hover:opacity-100 transition-opacity`}
                  title="Hapus percakapan"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">DOKUMEN</h3>
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="group flex justify-between items-center bg-gray-100 p-2 rounded-md text-sm">
                <span className="truncate">{doc.name}</span>
                <button 
                  onClick={() => onDeleteDocument(doc.id)} 
                  className="ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Hapus dokumen"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
              <input 
                type="file"
                accept=".txt,.pdf,.md" 
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              <button onClick={() => fileInputRef.current?.click()} className="w-full text-sm flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg">
                <UploadIcon className="w-4 h-4" />
                Unggah
              </button>
               <button onClick={onClearDocuments} className="text-sm flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg" title="Hapus semua dokumen">
                <TrashIcon className="w-4 h-4" />
              </button>
              <button onClick={onSettingsClick} className="text-sm flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded-lg" title="Pengaturan">
                <SettingsIcon className="w-4 h-4" />
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;