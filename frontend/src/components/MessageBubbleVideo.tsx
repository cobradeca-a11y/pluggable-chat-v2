import React, { useState } from 'react';
import { Message } from '../lib/types';
import { useTheme } from '../hooks/useTheme';
import { useVideoGeneration } from '../hooks/useVideoGeneration';

interface MessageBubbleVideoProps {
  message: Message;
  onRetry?: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s.toString().padStart(2, '0')}s`;
}

export function MessageBubbleVideo({ message, onRetry }: MessageBubbleVideoProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  // Use the hook to poll status based on message.content (which is the job_id or url)
  const { status, progress, url, error, elapsedSeconds } = useVideoGeneration(message.content);

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const handleDownload = async () => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `video_${new Date().getTime()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(objectUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download video", err);
      window.open(url, '_blank');
    }
  };

  const assistantBg = isDark ? '#27272a' : '#f0f0f0';
  const assistantColor = isDark ? '#f4f4f5' : '#18181b';
  const isError = message.isError || status === 'error';

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
          {status === 'completed' && url ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <video 
                controls 
                src={url} 
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
                  }} title="Baixar Vídeo">
                    Baixar
                  </button>
              </div>
            </div>
          ) : isError ? (
            <span>{error || message.content || 'Erro ao gerar vídeo'}</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 10px', gap: 8 }}>
              <div className="spinner" style={{
                width: 24, height: 24, border: `3px solid ${isDark ? '#3f3f46' : '#d4d4d8'}`,
                borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite'
              }} />
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              <div style={{ fontSize: 13, color: isDark ? '#a1a1aa' : '#52525b' }}>
                Gerando vídeo... {formatTime(elapsedSeconds)}
              </div>
              <div style={{ fontSize: 11, color: isDark ? '#71717a' : '#a1a1aa' }}>
                {status === 'queued' ? 'Na fila' : `Processando: ${progress}%`}
              </div>
            </div>
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
