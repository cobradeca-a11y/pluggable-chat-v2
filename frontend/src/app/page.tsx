"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { TypingIndicator } from '../components/TypingIndicator';
import { Toast } from '../components/Toast';
import { SettingsModal } from '../components/SettingsModal';
import { useTheme } from '../hooks/useTheme';

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { messages, input, setInput, loading, sendMessage, toast, clearToast, retryLastMessage, clearChat, providerSettings, saveProviderSettings } = useChat();
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden transition-colors duration-300">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={providerSettings} 
        onSave={saveProviderSettings} 
      />
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={clearToast} 
        />
      )}
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 bg-white/70 dark:bg-zinc-900/40 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/60 z-10 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-medium text-zinc-900 dark:text-zinc-100 transition-colors duration-300">Pluggable Chat</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 transition-colors duration-300">AI Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button 
              onClick={clearChat}
              className="p-1.5 mr-1 sm:mr-3 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition-colors flex items-center gap-1.5"
              title="Novo Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span className="text-xs font-medium hidden sm:block">Novo</span>
            </button>
          )}

          {/* Provider Badge */}
          <div className="hidden sm:flex items-center bg-zinc-100 dark:bg-zinc-800/50 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700/50 mr-1 sm:mr-3 transition-colors duration-300">
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 capitalize transition-colors duration-300">
              {providerSettings.provider || "Padrão"}
            </span>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 mr-1 sm:mr-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition-colors flex items-center justify-center"
            title="Configurações"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.99l1.004.828c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0Z" />
            </svg>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 mr-2 sm:mr-4 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition-colors flex items-center justify-center"
            title="Alternar Tema"
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>

          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-1 rounded-full border border-zinc-200 dark:border-zinc-700/50 transition-colors duration-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider pr-1 transition-colors duration-300">Online</span>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 scroll-smooth pb-[calc(env(safe-area-inset-bottom)+8rem)]">
        <div className="max-w-3xl mx-auto flex flex-col w-full h-full">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-20">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-6 border border-zinc-200 dark:border-zinc-700/50 shadow-xl transition-colors duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-500 dark:text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2 transition-colors duration-300">Como posso ajudar?</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm transition-colors duration-300">
                Inicie uma conversa. O assistente usará o LLM Provider configurado em seu backend.
              </p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble 
                key={idx} 
                message={msg} 
                onRetry={msg.isError && idx === messages.length - 1 ? retryLastMessage : undefined} 
              />
            ))
          )}
          {loading && <TypingIndicator />}
          <div ref={endOfMessagesRef} className="h-px" />
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-zinc-50 via-zinc-50 dark:from-zinc-950 dark:via-zinc-950 to-transparent pt-10 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] px-3 sm:px-6 z-20 transition-colors duration-300">
        <div className="max-w-3xl mx-auto w-full">
          <ChatInput 
            input={input} 
            setInput={setInput} 
            loading={loading} 
            sendMessage={(txt) => sendMessage(txt, true)} 
          />
          <div className="text-center mt-3">
            <span className="text-[10px] text-zinc-500 font-medium tracking-wide uppercase">AI Pluggable Architecture</span>
          </div>
        </div>
      </div>
    </div>
  );
}
