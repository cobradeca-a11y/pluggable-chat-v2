import React from 'react';

export function TypingIndicator() {
  return (
    <div className="flex w-full mb-6 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="max-w-[85%] md:max-w-[75%] px-5 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-700/50 text-zinc-900 dark:text-zinc-100 rounded-bl-sm shadow-sm flex gap-1.5 items-center transition-colors duration-300">
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce transition-colors duration-300" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce transition-colors duration-300" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce transition-colors duration-300" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
