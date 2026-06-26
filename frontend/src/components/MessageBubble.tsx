import React, { useState } from 'react';
import { Message } from '../lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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
          backgroundColor: isError ? '#450a0a' : isUser ? '#2563eb' : '#27272a',
          border: isError ? '1px solid #7f1d1d' : 'none',
          color: isError ? '#fca5a5' : '#f4f4f5',
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
          ) : (
            <div style={{ color: '#f4f4f5', fontSize: 14, lineHeight: 1.7 }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
                  strong: ({ children }) => <strong style={{ fontWeight: 700, color: '#ffffff' }}>{children}</strong>,
                  em: ({ children }) => <em style={{ fontStyle: 'italic', color: '#d4d4d8' }}>{children}</em>,
                  h1: ({ children }) => <h1 style={{ fontSize: 20, fontWeight: 700, margin: '12px 0 6px', color: '#ffffff' }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ fontSize: 17, fontWeight: 700, margin: '10px 0 4px', color: '#ffffff' }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, margin: '8px 0 4px', color: '#ffffff' }}>{children}</h3>,
                  ul: ({ children }) => <ul style={{ margin: '6px 0', paddingLeft: 20 }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ margin: '6px 0', paddingLeft: 20 }}>{children}</ol>,
                  li: ({ children }) => <li style={{ margin: '3px 0' }}>{children}</li>,
                  table: ({ children }) => (
                    <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => <thead style={{ backgroundColor: '#3f3f46' }}>{children}</thead>,
                  th: ({ children }) => <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '1px solid #52525b', color: '#ffffff', fontWeight: 600 }}>{children}</th>,
                  td: ({ children }) => <td style={{ padding: '6px 10px', borderBottom: '1px solid #3f3f46', color: '#d4d4d8' }}>{children}</td>,
                  code: ({ children, className }) => {
                    const isBlock = !!className;
                    return isBlock ? (
                      <code style={{
                        display: 'block',
                        backgroundColor: '#18181b',
                        padding: '10px 14px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontFamily: 'monospace',
                        overflowX: 'auto',
                        margin: '8px 0',
                        color: '#a5f3fc',
                        whiteSpace: 'pre'
                      }}>{children}</code>
                    ) : (
                      <code style={{
                        backgroundColor: '#18181b',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 13,
                        fontFamily: 'monospace',
                        color: '#a5f3fc'
                      }}>{children}</code>
                    );
                  },
                  pre: ({ children }) => <pre style={{ margin: 0 }}>{children}</pre>,
                  blockquote: ({ children }) => (
                    <blockquote style={{ borderLeft: '3px solid #3f3f46', paddingLeft: 12, margin: '8px 0', color: '#a1a1aa' }}>{children}</blockquote>
                  ),
                  hr: () => <hr style={{ border: 'none', borderTop: '1px solid #3f3f46', margin: '12px 0' }} />,
                  a: ({ children, href }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>{children}</a>
                  ),
                }}
              >{message.content}</ReactMarkdown>
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

        <button onClick={handleCopy} style={{
          position: 'absolute', top: 4,
          right: isUser ? undefined : -24,
          left: isUser ? -24 : undefined,
          background: 'none', border: 'none',
          color: '#52525b', cursor: 'pointer', fontSize: 13, padding: 2
        }} title="Copiar">
          {copied ? '✓' : '⎘'}
        </button>
      </div>
    </div>
  );
}
