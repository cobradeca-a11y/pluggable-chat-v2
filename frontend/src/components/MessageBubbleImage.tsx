import React, { useState } from 'react';
import { Message } from '../lib/types';
import { useTheme } from '../hooks/useTheme';

interface MessageBubbleImageProps {
  message: Message;
  onRetry?: () => void;
}

export function MessageBubbleImage({ message, onRetry }: MessageBubbleImageProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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

  const handleDownload = async () => {
    try {
      const response = await fetch(message.content);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image_${new Date().getTime()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download image", err);
      // Fallback fallback to direct navigation if blob fails (e.g. CORS)
      window.open(message.content, '_blank');
    }
  };

  const assistantBg = isDark ? '#27272a' : '#f0f0f0';
  const assistantColor = isDark ? '#f4f4f5' : '#18181b';
  const mutedColor = isDark ? '#a1a1aa' : '#71717a';

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      marginBottom: 16,
      justifyContent: isUser ? 'flex-end' : 'flex-start'
    }}>
      <div style={{ position: 'relative', maxWidth: '85%' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          backgroundColor: isError ? '#450a0a' : isUser ? '#2563eb' : assistantBg,
          border: isError ? '1px solid #7f1d1d' : 'none',
          color: isError ? '#fca5a5' : isUser ? '#ffffff' : assistantColor,
          fontSize: 14,
          lineHeight: 1.6,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {message.content && !isError ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <img 
                src={message.content} 
                alt="Generated" 
                style={{ 
                  maxWidth: '100%', 
                  borderRadius: 8, 
                  display: 'block',
                  backgroundColor: isDark ? '#18181b' : '#e4e4e7',
                  minHeight: 100
                }} 
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                 <button onClick={handleCopy} style={{
                    background: isDark ? '#3f3f46' : '#d4d4d8', 
                    border: 'none',
                    color: isDark ? '#f4f4f5' : '#18181b', 
                    cursor: 'pointer', 
                    fontSize: 12, 
                    padding: '4px 8px',
                    borderRadius: 4
                  }} title="Copiar URL">
                    {copied ? 'Copiado!' : 'Copiar URL'}
                  </button>
                  <button onClick={handleDownload} style={{
                    background: isDark ? '#3f3f46' : '#d4d4d8', 
                    border: 'none',
                    color: isDark ? '#f4f4f5' : '#18181b', 
                    cursor: 'pointer', 
                    fontSize: 12, 
                    padding: '4px 8px',
                    borderRadius: 4
                  }} title="Baixar Imagem">
                    Baixar
                  </button>
              </div>
            </div>
          ) : (
            <span>{message.content || 'Erro ao gerar imagem'}</span>
          )}

          {isError && onRetry && (
            <div style={{ marginTop: 10 }}>
              <button onClick={onRetry} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid #7f1d1d',
                backgroundColor: 'transparent', color: '#fca5a5', cursor: 'pointer', fontSize: 12
              }}>↺ Tentar novamente</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
