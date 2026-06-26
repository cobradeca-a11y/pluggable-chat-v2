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
  const {
    messages, input, setInput, loading, sendMessage,
    toast, clearToast, retryLastMessage, clearChat,
    providerSettings, saveProviderSettings, stopGeneration
  } = useChat();
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden', backgroundColor: theme === 'dark' ? '#09090b' : '#fafafa' }}>
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={providerSettings}
        onSave={saveProviderSettings}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}

      {/* Header */}
      <header style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
        borderBottom: theme === 'dark' ? '1px solid #27272a' : '1px solid #e4e4e7',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            backgroundColor: '#2563eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 16, fontWeight: 'bold'
          }}>P</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme === 'dark' ? '#f4f4f5' : '#18181b' }}>Pluggable Chat</div>
            <div style={{ fontSize: 11, color: '#71717a' }}>AI Assistant</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none',
                backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5',
                color: theme === 'dark' ? '#a1a1aa' : '#52525b',
                cursor: 'pointer', fontSize: 12
              }}
            >
              + Novo
            </button>
          )}

          <div style={{
            padding: '4px 8px', borderRadius: 6,
            backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5',
            color: '#71717a', fontSize: 11
          }}>
            {providerSettings.provider || 'Padrão'}
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            style={{
              padding: '6px 10px', borderRadius: 8, border: 'none',
              backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5',
              color: theme === 'dark' ? '#a1a1aa' : '#52525b',
              cursor: 'pointer', fontSize: 14
            }}
            title="Configurações"
          >⚙</button>

          <button
            onClick={toggleTheme}
            style={{
              padding: '6px 10px', borderRadius: 8, border: 'none',
              backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5',
              color: theme === 'dark' ? '#a1a1aa' : '#52525b',
              cursor: 'pointer', fontSize: 14
            }}
            title="Tema"
          >{theme === 'dark' ? '☀' : '🌙'}</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 20, backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
            <span style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 1 }}>Online</span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', paddingBottom: '120px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: theme === 'dark' ? '#f4f4f5' : '#18181b', marginBottom: 8 }}>
                Como posso ajudar?
              </h2>
              <p style={{ fontSize: 14, color: '#71717a' }}>
                Inicie uma conversa com o assistente.
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
          <div ref={endOfMessagesRef} />
        </div>
      </main>

      {/* Input */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, width: '100%',
        padding: '16px 20px 20px',
        backgroundColor: theme === 'dark' ? '#09090b' : '#fafafa',
        borderTop: theme === 'dark' ? '1px solid #27272a' : '1px solid #e4e4e7'
      }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <ChatInput
            input={input}
            setInput={setInput}
            loading={loading}
            sendMessage={(txt) => sendMessage(txt, true)}
            stopGeneration={stopGeneration}
          />
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: 1 }}>
              AI Pluggable Architecture
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
