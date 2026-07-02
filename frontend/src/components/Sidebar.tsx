import React, { useState, useRef, useEffect } from 'react';
import { Conversation } from '../lib/types';
import { useTheme } from '../hooks/useTheme';
import { exportAsMarkdown, exportAsJson } from '../lib/export';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onRename, isOpen, onClose }: SidebarProps) {
  const { theme } = useTheme();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Foca o input de edição ao entrar no modo rename
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const isDark = theme === 'dark';

  const handleRenameSubmit = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle);
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditTitle('');
    }
  };

  // Filtrar conversas pela busca
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(c => {
        const q = searchQuery.toLowerCase();
        if (c.title.toLowerCase().includes(q)) return true;
        return c.messages.some(m => m.content?.toLowerCase().includes(q));
      })
    : conversations;

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, height: '100vh', width: 260,
        backgroundColor: isDark ? '#09090b' : '#fafafa',
        borderRight: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease-in-out',
        zIndex: 50, display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={onNew}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none',
              backgroundColor: isDark ? '#27272a' : '#f4f4f5',
              color: isDark ? '#f4f4f5' : '#18181b',
              cursor: 'pointer', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8
            }}
          >
            <span>+</span> Nova Conversa
          </button>
          <button
            onClick={onClose}
            style={{ marginLeft: 12, padding: 8, background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Busca */}
        <div style={{ padding: '0 16px 12px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar conversas..."
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              color: isDark ? '#f4f4f5' : '#18181b',
              fontSize: 13, outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
          {filteredConversations.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 40, color: '#71717a', fontSize: 13 }}>
              {searchQuery.trim() ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredConversations.map(conv => (
                <div
                  key={conv.id}
                  style={{
                    position: 'relative',
                    display: 'flex', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                    backgroundColor: activeId === conv.id
                      ? (isDark ? '#27272a' : '#e4e4e7')
                      : 'transparent',
                    color: activeId === conv.id
                      ? (isDark ? '#f4f4f5' : '#18181b')
                      : '#71717a'
                  }}
                  onClick={() => {
                    if (editingId !== conv.id) {
                      onSelect(conv.id);
                      if (window.innerWidth < 768) onClose();
                    }
                  }}
                  onDoubleClick={() => {
                    setEditingId(conv.id);
                    setEditTitle(conv.title);
                  }}
                >
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
                    {editingId === conv.id ? (
                      <input
                        ref={editInputRef}
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={handleRenameKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '100%', padding: '2px 4px', borderRadius: 4,
                          border: isDark ? '1px solid #3f3f46' : '1px solid #d4d4d8',
                          backgroundColor: isDark ? '#18181b' : '#ffffff',
                          color: isDark ? '#f4f4f5' : '#18181b',
                          fontSize: 14, outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    ) : (
                      conv.title
                    )}
                  </div>

                  {/* Botão "..." */}
                  {editingId !== conv.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                      }}
                      style={{
                        background: 'transparent', border: 'none',
                        color: '#71717a', cursor: 'pointer',
                        padding: '2px 6px', fontSize: 16, lineHeight: 1,
                        borderRadius: 4,
                      }}
                      title="Opções"
                    >
                      ···
                    </button>
                  )}

                  {/* Dropdown */}
                  {menuOpenId === conv.id && (
                    <div
                      ref={menuRef}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute', right: 0, top: '100%',
                        backgroundColor: isDark ? '#18181b' : '#ffffff',
                        border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
                        borderRadius: 8, padding: '4px 0',
                        zIndex: 100, minWidth: 160,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    >
                      <button
                        onClick={() => {
                          setMenuOpenId(null);
                          setEditingId(conv.id);
                          setEditTitle(conv.title);
                        }}
                        style={{
                          display: 'block', width: '100%',
                          padding: '8px 16px', background: 'transparent',
                          border: 'none', textAlign: 'left',
                          cursor: 'pointer', fontSize: 14,
                          color: isDark ? '#d4d4d8' : '#3f3f46',
                        }}
                      >
                        Renomear
                      </button>
                      <button
                        onClick={() => {
                          exportAsMarkdown(conv);
                          setMenuOpenId(null);
                        }}
                        style={{
                          display: 'block', width: '100%',
                          padding: '8px 16px', background: 'transparent',
                          border: 'none', textAlign: 'left',
                          cursor: 'pointer', fontSize: 14,
                          color: isDark ? '#d4d4d8' : '#3f3f46',
                        }}
                      >
                        Exportar .md
                      </button>
                      <button
                        onClick={() => {
                          exportAsJson(conv);
                          setMenuOpenId(null);
                        }}
                        style={{
                          display: 'block', width: '100%',
                          padding: '8px 16px', background: 'transparent',
                          border: 'none', textAlign: 'left',
                          cursor: 'pointer', fontSize: 14,
                          color: isDark ? '#d4d4d8' : '#3f3f46',
                        }}
                      >
                        Exportar .json
                      </button>
                      <hr style={{
                        margin: '4px 0', border: 'none',
                        borderTop: isDark ? '1px solid #27272a' : '1px solid #e4e4e7'
                      }} />
                      <button
                        onClick={() => {
                          setMenuOpenId(null);
                          setConfirmId(conv.id);
                        }}
                        style={{
                          display: 'block', width: '100%',
                          padding: '8px 16px', background: 'transparent',
                          border: 'none', textAlign: 'left',
                          cursor: 'pointer', fontSize: 14,
                          color: '#dc2626', fontWeight: 700,
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação */}
      {confirmId && (
        <div
          onClick={() => setConfirmId(null)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 200, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
              borderRadius: 12, padding: 24, width: 300,
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}
          >
            <p style={{ margin: '0 0 20px', fontSize: 15, color: isDark ? '#f4f4f5' : '#18181b' }}>
              Deseja realmente excluir esta conversa?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmId(null)}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  backgroundColor: isDark ? '#27272a' : '#f4f4f5',
                  color: isDark ? '#f4f4f5' : '#18181b',
                  cursor: 'pointer', fontSize: 14
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDelete(confirmId);
                  setConfirmId(null);
                }}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none',
                  backgroundColor: '#dc2626', color: '#ffffff',
                  cursor: 'pointer', fontSize: 14, fontWeight: 700
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}