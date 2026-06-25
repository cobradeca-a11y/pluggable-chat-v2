import React, { useState } from 'react';
import { Message } from '../lib/types';

interface MessageBubbleProps {
  message: Message;
  onRetry?: () => void;
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.isError;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  let bubbleStyles = isUser 
    ? 'bg-blue-600 text-white rounded-br-sm transition-colors duration-300' 
    : 'bg-zinc-100 dark:bg-zinc-800/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 rounded-bl-sm transition-colors duration-300';

  if (isError) {
    bubbleStyles = 'bg-red-50 dark:bg-red-500/10 border border-red-500/50 text-red-700 dark:text-red-200 rounded-bl-sm transition-colors duration-300';
  }
  
  return (
    <div className={`flex w-full mb-6 group ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      <div className="relative max-w-[95%] md:max-w-md lg:max-w-[600px]">
        <div 
          className={`px-5 py-3.5 rounded-2xl whitespace-pre-wrap shadow-sm text-sm leading-relaxed ${bubbleStyles}`}
        >
          {message.content}
          
          {isError && onRetry && (
            <div className="mt-3">
              <button 
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-medium transition-colors border border-red-500/30"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
                </svg>
                Tentar novamente
              </button>
            </div>
          )}
        </div>
        
        {/* Copy Button */}
        {!isError && (
          <div className={`absolute ${isUser ? '-left-10' : '-right-10'} top-1/2 -translate-y-1/2 opacity-0 md:group-hover:opacity-100 transition-opacity`}>
            <button 
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition-colors duration-300"
              title="Copiar mensagem"
            >
              {copied ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
