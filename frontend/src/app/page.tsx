"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInput } from '../components/ChatInput';
import { TypingIndicator } from '../components/TypingIndicator';
import { Toast } from '../components/Toast';
import { SettingsModal } from '../components/SettingsModal';
import { Sidebar } from '../components/Sidebar';
import { useTheme } from '../hooks/useTheme';
import { useActiveModel } from '../hooks/useActiveModel';
import { Attachment } from '../lib/types';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated === false) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const {
    messages, input, setInput, loading, sendMessage,
    toast, clearToast, showToast, retryLastMessage, clearChat,
    providerSettings, saveProviderSettings, stopGeneration,
    conversations
  } = useChat();

  const { provider, model, supportedAttachments, canText, canImage, canVideo } = useActiveModel(providerSettings);

  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    handleResize();
    if (window.innerWidth >= 768) setIsSidebarOpen(true);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Atalhos de teclado globais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Escape sempre funciona
      if (e.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isSidebarOpen && !isDesktop) setIsSidebarOpen(false);
        return;
      }

      // Ctrl+K e Ctrl+B não disparam dentro de inputs
      if (isInput) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearChat();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen, isSidebarOpen, isDesktop, clearChat]);

  const handleScroll = () => {
    if (mainRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = mainRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAutoScroll(isAtBottom);
    }
  };

  useEffect(() => {
    if (isAutoScroll) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }
  }, [messages, isAutoScroll]);

  const handleSendMessage = (txt: string, stream = true, attachment?: Attachment, mode?: string) => {
    setIsAutoScroll(true);
    sendMessage(txt, stream, attachment, mode);
    setPendingAttachment(null);
  };

  const handleAttach = (att: Attachment | null) => {
    if (att && supportedAttachments.length > 0 && !supportedAttachments.includes(att.type)) {
      showToast('Este provider não suporta este tipo de arquivo.', 'error');
      return;
    }
    setPendingAttachment(att);
  };

  if (isAuthenticated === null || isAuthenticated === false) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: theme === 'dark' ? '#09090b' : '#fafafa', color: theme === 'dark' ? '#f4f4f5' : '#18181b' }}>Carregando...</div>;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden', backgroundColor: theme === 'dark' ? '#09090b' : '#fafafa' }}>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={providerSettings}
        onSave={saveProviderSettings}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}

      <Sidebar
        conversations={conversations.conversations}
        activeId={conversations.activeId}
        onSelect={conversations.loadConversation}
        onNew={clearChat}
        onDelete={conversations.deleteConversation}
        onRename={conversations.renameConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        marginLeft: (isSidebarOpen && isDesktop) ? 260 : 0,
        transition: 'margin-left 0.2s ease-in-out',
        width: '100%'
      }}>
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
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                style={{
                  background: 'transparent', border: 'none', color: theme === 'dark' ? '#f4f4f5' : '#18181b',
                  fontSize: 20, cursor: 'pointer', padding: '4px', marginRight: 8
                }}
                title="Abrir Sidebar"
              >
                ☰
              </button>
            )}
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
            {messages.length > 0 && !isDesktop && (
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

            <button
              onClick={logout}
              style={{
                padding: '6px 10px', borderRadius: 8, border: 'none',
                backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5',
                color: theme === 'dark' ? '#a1a1aa' : '#52525b',
                cursor: 'pointer', fontSize: 14
              }}
              title="Sair"
            >🚪</button>

            <div style={{ display: isDesktop ? 'flex' : 'none', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 20, backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              <span style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: 1 }}>Online</span>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <main ref={mainRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', paddingBottom: '160px' }}>
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
          position: 'fixed', bottom: 0,
          left: (isSidebarOpen && isDesktop) ? 260 : 0,
          width: (isSidebarOpen && isDesktop) ? 'calc(100% - 260px)' : '100%',
          transition: 'left 0.2s ease-in-out, width 0.2s ease-in-out',
          padding: '16px 20px 20px',
          backgroundColor: theme === 'dark' ? '#09090b' : '#fafafa',
          borderTop: theme === 'dark' ? '1px solid #27272a' : '1px solid #e4e4e7'
        }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <ChatInput
              input={input}
              setInput={setInput}
              loading={loading}
              sendMessage={handleSendMessage}
              stopGeneration={stopGeneration}
              attachment={pendingAttachment}
              onAttach={handleAttach}
              onAttachError={(msg) => showToast(msg, 'error')}
              providerCapabilities={{ canText, canImage, canVideo }}
            />
            <div style={{ textAlign: 'center', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: 1 }}>
                AI Pluggable Architecture
              </span>
              <span style={{ fontSize: 11, color: '#71717a' }}>
                {provider} · {model}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
