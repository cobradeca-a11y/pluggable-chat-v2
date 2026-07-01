import React, { useRef, useEffect, useState } from 'react';
import { Attachment } from '../lib/types';
import { useTheme } from '../hooks/useTheme';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  sendMessage: (text: string, stream?: boolean, attachment?: Attachment, mode?: string) => void;
  stopGeneration?: () => void;
  attachment: Attachment | null;
  onAttach: (attachment: Attachment | null) => void;
  onAttachError?: (message: string) => void;
  providerCapabilities?: { canText: boolean, canImage: boolean, canVideo: boolean };
  personaSelector?: React.ReactNode;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.webp';

export function ChatInput({ 
  input, setInput, loading, sendMessage, stopGeneration, 
  attachment, onAttach, onAttachError, providerCapabilities, personaSelector
}: ChatInputProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [mode, setMode] = useState<'text' | 'image' | 'video'>('text');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (providerCapabilities) {
      if (!providerCapabilities.canText) {
        if (providerCapabilities.canImage) setMode('image');
        else if (providerCapabilities.canVideo) setMode('video');
      }
      // If capabilities change, ensure current mode is valid
      if (mode === 'image' && !providerCapabilities.canImage) setMode('text');
      if (mode === 'video' && !providerCapabilities.canVideo) setMode('text');
      if (mode === 'text' && !providerCapabilities.canText && providerCapabilities.canImage) setMode('image');
    }
  }, [providerCapabilities]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input, mode === 'text', attachment || undefined, mode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (loading) return;
      sendMessage(input, mode === 'text', attachment || undefined, mode);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      onAttachError?.("O arquivo excede o limite de 10MB.");
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      onAttach({
        name: file.name,
        type: file.type,
        data: base64
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const hasMultipleModes = providerCapabilities && (
    (providerCapabilities.canText ? 1 : 0) + 
    (providerCapabilities.canImage ? 1 : 0) + 
    (providerCapabilities.canVideo ? 1 : 0) > 1
  );

  return (
    <div>
      {/* Mode Selector */}
      {hasMultipleModes && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {providerCapabilities?.canText && (
            <button 
              type="button" 
              onClick={() => setMode('text')}
              style={{ 
                padding: '4px 12px', borderRadius: 12, fontSize: 12, cursor: 'pointer', border: 'none',
                backgroundColor: mode === 'text' ? '#2563eb' : (isDark ? '#27272a' : '#e4e4e7'),
                color: mode === 'text' ? '#ffffff' : (isDark ? '#a1a1aa' : '#52525b')
              }}
            >
              Texto
            </button>
          )}
          {providerCapabilities?.canImage && (
            <button 
              type="button" 
              onClick={() => setMode('image')}
              style={{ 
                padding: '4px 12px', borderRadius: 12, fontSize: 12, cursor: 'pointer', border: 'none',
                backgroundColor: mode === 'image' ? '#2563eb' : (isDark ? '#27272a' : '#e4e4e7'),
                color: mode === 'image' ? '#ffffff' : (isDark ? '#a1a1aa' : '#52525b')
              }}
            >
              Imagem
            </button>
          )}
          {providerCapabilities?.canVideo && (
            <button 
              type="button" 
              onClick={() => setMode('video')}
              style={{ 
                padding: '4px 12px', borderRadius: 12, fontSize: 12, cursor: 'pointer', border: 'none',
                backgroundColor: mode === 'video' ? '#2563eb' : (isDark ? '#27272a' : '#e4e4e7'),
                color: mode === 'video' ? '#ffffff' : (isDark ? '#a1a1aa' : '#52525b')
              }}
            >
              Vídeo
            </button>
          )}
        </div>
      )}

      {/* Preview do anexo */}
      {attachment && mode === 'text' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', marginBottom: 8,
          borderRadius: 8,
          backgroundColor: isDark ? '#27272a' : '#e4e4e7',
          color: isDark ? '#a1a1aa' : '#52525b', fontSize: 13
        }}>
          <span>📎</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {attachment.name}
          </span>
          <button
            onClick={() => onAttach(null)}
            style={{
              background: 'transparent', border: 'none',
              color: '#71717a', cursor: 'pointer', fontSize: 14,
              padding: '2px 6px'
            }}
            title="Remover anexo"
          >
            ✕
          </button>
        </div>
      )}

      {personaSelector && (
        <div style={{ marginBottom: 8 }}>
          {personaSelector}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || mode !== 'text'}
          style={{
            width: 44, height: 44, borderRadius: 12, border: 'none',
            backgroundColor: isDark ? '#27272a' : '#e4e4e7',
            color: isDark ? '#a1a1aa' : '#52525b', cursor: (loading || mode !== 'text') ? 'not-allowed' : 'pointer',
            fontSize: 18,
            display: mode !== 'text' ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            opacity: (loading || mode !== 'text') ? 0.6 : 1
          }}
          title="Anexar arquivo"
        >
          📎
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'video' ? "Descreva o vídeo que deseja gerar..." : mode === 'image' ? "Descreva a imagem que deseja gerar..." : "Digite uma mensagem..."}
          disabled={loading}
          rows={1}
          style={{
            flex: 1,
            minHeight: 44,
            maxHeight: 120,
            padding: '10px 14px',
            borderRadius: 12,
            border: isDark ? '1px solid #3f3f46' : '1px solid #d4d4d8',
            backgroundColor: isDark ? '#18181b' : '#ffffff',
            color: isDark ? '#f4f4f5' : '#18181b',
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
              backgroundColor: input.trim() ? '#2563eb' : (isDark ? '#3f3f46' : '#d4d4d8'),
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
    </div>
  );
}
