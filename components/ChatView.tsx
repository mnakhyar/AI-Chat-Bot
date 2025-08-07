
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, Message as MessageType, Role } from '../types';
import MessageComponent from './Message';
import { PaperPlaneIcon, InJourneyLogo, MenuIcon } from './Icons';

interface ChatViewProps {
  chat: ChatSession | null;
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onMenuClick: () => void;
}

const WelcomeScreen: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-center p-4">
    <InJourneyLogo className="h-16 w-auto opacity-50" />
    <h1 className="mt-4 text-2xl font-bold text-injourney-text-dark">Chat with InJourney Airport AI</h1>
    <p className="mt-2 text-gray-500">Mulai percakapan baru atau pilih dari riwayat Anda.</p>
    <p className="mt-1 text-gray-500">Unggah dokumen untuk memberikan konteks pada AI.</p>
  </div>
);

const ChatView: React.FC<ChatViewProps> = ({ chat, isLoading, onSendMessage, onMenuClick }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages, isLoading]);
  
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-injourney-bg-light h-screen">
      <header className="p-4 border-b border-injourney-border bg-white sticky top-0 flex items-center gap-4 z-10">
        <button onClick={onMenuClick} className="text-gray-600 hover:text-injourney-accent md:hidden">
            <MenuIcon className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold text-injourney-text-dark truncate">
            {chat ? chat.title : 'Chat with InJourney Airport AI'}
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto">
        {chat ? (
          <div className="max-w-4xl mx-auto w-full">
            {chat.messages.map(msg => (
              <MessageComponent key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <MessageComponent 
                message={{ id: 'loading', role: Role.MODEL, text: '...'}}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <WelcomeScreen />
        )}
      </div>

      <div className="p-4 bg-white/80 backdrop-blur-sm border-t border-injourney-border">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                  }
              }}
              placeholder="Ketik pertanyaan Anda di sini..."
              className="w-full max-h-48 p-4 pr-16 text-injourney-text-dark bg-injourney-bg-light border border-injourney-border rounded-lg focus:ring-2 focus:ring-injourney-accent focus:outline-none resize-none"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors bg-injourney-accent text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-opacity-90"
              aria-label="Send message"
            >
              <PaperPlaneIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatView;