import React, { useRef, useEffect } from 'react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  sendMessage: (text: string) => void;
}

export function ChatInput({ input, setInput, loading, sendMessage }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <form 
      onSubmit={handleSubmit}
      className="relative flex items-end w-full p-2 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700/50 backdrop-blur-md rounded-2xl shadow-lg transition-all duration-300 focus-within:ring-1 focus-within:ring-blue-500/50 focus-within:border-blue-500/50"
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite uma mensagem..."
        disabled={loading}
        className="flex-1 min-h-[44px] sm:min-h-[40px] max-h-[120px] bg-transparent text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border-none outline-none resize-none px-3 py-3 sm:py-2 text-base sm:text-sm leading-relaxed disabled:opacity-50 transition-colors duration-300"
        rows={1}
      />
      <button
        type="submit"
        disabled={!input.trim() || loading}
        className="ml-2 flex-shrink-0 h-11 w-11 sm:h-9 sm:w-9 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mb-0 sm:mb-0.5 mr-0 sm:mr-0.5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 ml-0.5">
          <path d="M3.105 2.288a.75.75 0 00-.826.95l1.414 4.926A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.155.75.75 0 000-1.114A28.897 28.897 0 003.105 2.288z" />
        </svg>
      </button>
    </form>
  );
}
