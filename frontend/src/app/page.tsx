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
import { useAvailableModels } from '../hooks/useAvailableModels';
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
    conversations, personas
  } = useChat();

  const { provider, model, supportedAttachments, canText, canImage, canVideo } = useActiveModel(providerSettings);

  const [providers, setProviders] = useState<any[]>([]);
  const { models: availableModels } = useAvailableModels(providerSettings.provider);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pluggable-chat-v2-production.up.railway.app';
        const res = await fetch(`${baseUrl}/api/plugins`);
        if (res.ok) {
          const data = await res.json();
          setProviders(data.providers || []);
        }
      } catch (err) {
        console.error("Failed to fetch plugins", err);
      }
    };
    fetchProviders();
  }, []);

  const handleProviderChange = (newProvider: string) => {
    let defaultModel = providerSettings.model;
    if (newProvider === 'openrouter' && !defaultModel.includes('openrouter')) {
      defaultModel = 'openrouter/auto:free';
    } else if (newProvider === 'ollama-cloud' && !defaultModel.includes('llama')) {
      defaultModel = 'llama3.2';
    }
    saveProviderSettings({ ...providerSettings, provider: newProvider, model: defaultModel });
  };

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

  const isProgrammaticScrollRef = useRef(false);

  const handleScroll = () => {
    if (isProgrammaticScrollRef.current) return; // ignora o próprio auto-scroll
    if (mainRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = mainRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 120;
      setIsAutoScroll(isAtBottom);
    }
  };

  useEffect(() => {
    if (isAutoScroll && mainRef.current) {
      isProgrammaticScrollRef.current = true;
      mainRef.current.scrollTop = mainRef.current.scrollHeight;
      requestAnimationFrame(() => { isProgrammaticScrollRef.current = false; });
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
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: theme === 'dark' ? '#09090b' : '#fafafa', color: theme === 'dark' ? '#f4f4f5' : '#18181b' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `3px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
          borderTopColor: '#3b82f6',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
        <span style={{ fontSize: 14, opacity: 0.7 }}>Verificando sessão...</span>
      </div>
    );
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
        personasHook={personas}
      />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
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
        <main ref={mainRef} onScroll={handleScroll} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '24px 20px', paddingBottom: '160px' }}>
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
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, fontSize: 12, opacity: 0.7 }}>
                <select
                  value={providerSettings.provider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  style={{ background: 'transparent', border: 'none', fontSize: 12, opacity: 0.85, cursor: 'pointer', outline: 'none' }}
                >
                  {providers.length > 0 ? (
                    providers.map(p => (
                      <option key={p.name} value={p.name} style={{ background: theme === 'dark' ? '#27272a' : '#fff' }}>
                        {p.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="openrouter" style={{ background: theme === 'dark' ? '#27272a' : '#fff' }}>openrouter</option>
                      <option value="ollama-cloud" style={{ background: theme === 'dark' ? '#27272a' : '#fff' }}>ollama-cloud</option>
                    </>
                  )}
                </select>
                <span>·</span>
                <select
                  value={providerSettings.model}
                  onChange={(e) => saveProviderSettings({ ...providerSettings, model: e.target.value })}
                  style={{ background: 'transparent', border: 'none', fontSize: 12, opacity: 0.85, cursor: 'pointer', outline: 'none', maxWidth: 150, textOverflow: 'ellipsis' }}
                >
                  {availableModels.length > 0 ? (
                    availableModels.map(m => (
                      <option key={m} value={m} style={{ background: theme === 'dark' ? '#27272a' : '#fff' }}>
                        {m}
                      </option>
                    ))
                  ) : (
                    <option value={providerSettings.model} style={{ background: theme === 'dark' ? '#27272a' : '#fff' }}>{providerSettings.model}</option>
                  )}
                </select>
              </div>
              <div style={{ textAlign: 'center', fontSize: 11, opacity: 0.5 }}>
                AI PLUGGABLE ARCHITECTURE BY André d'Eça
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
