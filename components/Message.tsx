
import React, { useState } from 'react';
import { marked } from 'marked';
import { Message, Role } from '../types';
import { InJourneyLogo, UserIcon, CopyIcon } from './Icons';

interface MessageProps {
  message: Message;
}

const MessageComponent: React.FC<MessageProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isModel = message.role === Role.MODEL;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const name = isModel ? 'InJourney Airport AI' : 'Anda';

  return (
    <div className={`flex items-start gap-4 p-4 md:p-6 ${isModel ? '' : 'bg-white border-y border-injourney-border'}`}>
        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            {isModel ? (
                <InJourneyLogo className="h-5 w-auto" />
            ) : (
                <div className="w-full h-full rounded-full bg-injourney-accent/10 flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-gray-500" />
                </div>
            )}
        </div>
        <div className="flex-grow">
            <div className="flex justify-between items-center">
                <p className="font-semibold text-injourney-text-dark">{name}</p>
                {isModel && (
                    <button onClick={handleCopy} className="text-gray-400 hover:text-injourney-accent transition-colors">
                        {copied ? <span className="text-sm text-injourney-accent">Disalin!</span> : <CopyIcon className="w-5 h-5" />}
                    </button>
                )}
            </div>
            <div className="mt-1 text-injourney-text-dark max-w-none">
                {isModel ? (
                    <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: marked(message.text) as string }}
                    />
                ) : (
                    <p className="whitespace-pre-wrap font-sans">{message.text}</p>
                )}
            </div>
        </div>
    </div>
  );
};

export default MessageComponent;