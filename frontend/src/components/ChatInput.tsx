import React, { useRef, useEffect } from 'react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  sendMessage: (text: string) => void;
  stopGeneration?: () => void;
}

export function ChatInput({ input, setInput, loading, sendMessage, stopGeneration }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (loading) return;
      sendMessage(input);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite uma mensagem..."
        disabled={loading}
        rows={1}
        style={{
          flex: 1,
          minHeight: 44,
          maxHeight: 120,
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px solid #3f3f46',
          backgroundColor: '#18181b',
          color: '#f4f4f5',
          fontSize: 14,
          resize: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          opacity: loading ? 0.6 : 1
        }}
      />
      {loading ? (
        <button
          type="button"
          onClick={stopGeneration}
          style={{
            width: 44, height: 44, borderRadius: 12, border: 'none',
            backgroundColor: '#ef4444',
            color: 'white', cursor: 'pointer',
            fontSize: 18, fontWeight: 'bold',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}
          title="Parar geração"
        >
          ■
        </button>
      ) : (
        <button
          type="submit"
          disabled={!input.trim()}
          style={{
            width: 44, height: 44, borderRadius: 12, border: 'none',
            backgroundColor: input.trim() ? '#2563eb' : '#3f3f46',
            color: 'white', cursor: input.trim() ? 'pointer' : 'not-allowed',
            fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}
        >
          ➤
        </button>
      )}
    </form>
  );
}
