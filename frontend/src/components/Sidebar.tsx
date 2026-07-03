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
  personasHook?: any; // Recebe o retorno do usePersonas
}

export function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onRename, isOpen, onClose, personasHook }: SidebarProps) {
  const { theme } = useTheme();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'conversations' | 'personas'>('conversations');
  const [isCreatingPersona, setIsCreatingPersona] = useState(false);
  const [personaDescription, setPersonaDescription] = useState('');
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [previewPersona, setPreviewPersona] = useState<{ suggested_name: string; system_prompt: string } | null>(null);
  const [personaNameOverride, setPersonaNameOverride] = useState('');
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  
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
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: isDark ? '1px solid #27272a' : '1px solid #e4e4e7' }}>
          <button
            onClick={() => setActiveTab('conversations')}
            style={{
              flex: 1, padding: '12px 0', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === 'conversations' ? 600 : 400,
              color: activeTab === 'conversations' ? (isDark ? '#f4f4f5' : '#18181b') : '#71717a',
              borderBottom: activeTab === 'conversations' ? '2px solid #2563eb' : '2px solid transparent',
            }}
          >
            Conversas
          </button>
          <button
            onClick={() => setActiveTab('personas')}
            style={{
              flex: 1, padding: '12px 0', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: activeTab === 'personas' ? 600 : 400,
              color: activeTab === 'personas' ? (isDark ? '#f4f4f5' : '#18181b') : '#71717a',
              borderBottom: activeTab === 'personas' ? '2px solid #2563eb' : '2px solid transparent',
            }}
          >
            Personas
          </button>
        </div>

        {/* Conteúdo da aba selecionada */}
        {activeTab === 'conversations' ? (
          <>
            {/* Header Conversas */}
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
                style={{ marginLeft: 12, padding: 8, background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', display: window.innerWidth < 768 ? 'block' : 'none' }}
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

            {/* Lista Conversas */}
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
      </>
    ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
            <div style={{ padding: '0 4px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#f4f4f5' : '#18181b' }}>Minhas Personas</span>
              <button
                onClick={() => setIsCreatingPersona(true)}
                style={{
                  background: 'transparent', border: 'none', color: '#2563eb',
                  cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0
                }}
              >
                + Nova
              </button>
            </div>
            
            {personasHook?.personas.length === 0 ? (
              <div style={{ textAlign: 'center', marginTop: 40, color: '#71717a', fontSize: 13 }}>
                Você ainda não criou nenhuma persona.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {personasHook?.personas.map((p: any) => (
                  <div
                    key={p.id}
                    style={{
                      padding: '12px', borderRadius: 8, cursor: 'pointer',
                      border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
                      backgroundColor: personasHook.activePersonaId === p.id
                        ? (isDark ? '#27272a' : '#e4e4e7')
                        : (isDark ? '#18181b' : '#ffffff'),
                    }}
                    onClick={() => personasHook.selectPersona(p.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#f4f4f5' : '#18181b' }}>{p.name}</span>
                      {personasHook.activePersonaId === p.id && (
                        <span style={{ fontSize: 10, backgroundColor: '#2563eb', color: '#fff', padding: '2px 6px', borderRadius: 12 }}>Ativa</span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: '#71717a', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.system_prompt}
                    </p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Deseja realmente excluir esta persona?')) {
                            personasHook.deletePersona(p.id);
                          }
                        }}
                        style={{
                          background: 'transparent', border: 'none', color: '#dc2626',
                          cursor: 'pointer', fontSize: 12, padding: 0
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Nova Persona */}
      {isCreatingPersona && (
        <div
          onClick={() => setIsCreatingPersona(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            zIndex: 200, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 16
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
              borderRadius: 16, padding: 24, width: '100%', maxWidth: 450,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600, color: isDark ? '#f4f4f5' : '#18181b' }}>
              Criar Nova Persona
            </h3>

            {!previewPersona ? (
              <>
                <p style={{ fontSize: 13, color: '#71717a', marginBottom: 12 }}>
                  Descreva o papel, especialidade ou tom de voz que você precisa:
                </p>
                <textarea
                  value={personaDescription}
                  onChange={(e) => setPersonaDescription(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 12,
                    border: isDark ? '1px solid #3f3f46' : '1px solid #d4d4d8',
                    backgroundColor: isDark ? '#09090b' : '#fafafa',
                    color: isDark ? '#f4f4f5' : '#18181b',
                    fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box'
                  }}
                  placeholder="Ex: Você é um revisor de código sênior focado em performance..."
                />
                <button
                  onClick={async () => {
                    if (!personaDescription.trim() || !personasHook) return;
                    setIsGeneratingPersona(true);
                    const result = await personasHook.generatePersona(personaDescription);
                    setIsGeneratingPersona(false);
                    if (result) {
                      setPreviewPersona(result);
                      setPersonaNameOverride(result.suggested_name);
                    }
                  }}
                  disabled={isGeneratingPersona || !personaDescription.trim()}
                  style={{
                    width: '100%', padding: '12px', marginTop: 16, borderRadius: 12, border: 'none',
                    backgroundColor: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 600,
                    cursor: (isGeneratingPersona || !personaDescription.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (isGeneratingPersona || !personaDescription.trim()) ? 0.7 : 1
                  }}
                >
                  {isGeneratingPersona ? 'Gerando inteligência...' : 'Gerar Persona com IA'}
                </button>
              </>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: 12, color: '#71717a', marginBottom: 6 }}>Nome da Persona</label>
                <input
                  value={personaNameOverride}
                  onChange={(e) => setPersonaNameOverride(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 8, marginBottom: 16,
                    border: isDark ? '1px solid #3f3f46' : '1px solid #d4d4d8',
                    backgroundColor: isDark ? '#09090b' : '#fafafa',
                    color: isDark ? '#f4f4f5' : '#18181b',
                    fontSize: 14, outline: 'none', boxSizing: 'border-box'
                  }}
                />
                <label style={{ display: 'block', fontSize: 12, color: '#71717a', marginBottom: 6 }}>System Prompt</label>
                <textarea
                  value={previewPersona.system_prompt}
                  onChange={(e) => setPreviewPersona({ ...previewPersona, system_prompt: e.target.value })}
                  rows={6}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 8,
                    border: isDark ? '1px solid #3f3f46' : '1px solid #d4d4d8',
                    backgroundColor: isDark ? '#09090b' : '#fafafa',
                    color: isDark ? '#f4f4f5' : '#18181b',
                    fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button
                    onClick={() => setPreviewPersona(null)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: isDark ? '1px solid #3f3f46' : '1px solid #d4d4d8',
                      backgroundColor: 'transparent', color: isDark ? '#f4f4f5' : '#18181b',
                      cursor: 'pointer', fontSize: 14, fontWeight: 500
                    }}
                  >
                    Voltar
                  </button>
                  <button
                    onClick={async () => {
                      if (!personasHook || !previewPersona || isSavingPersona) return;
                      setIsSavingPersona(true);
                      const p = await personasHook.savePersona(personaNameOverride || previewPersona.suggested_name, previewPersona.system_prompt);
                      setIsSavingPersona(false);
                      if (p) {
                        personasHook.selectPersona(p.id);
                        setIsCreatingPersona(false);
                        setPreviewPersona(null);
                        setPersonaDescription("");
                      }
                    }}
                    disabled={isSavingPersona}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                      backgroundColor: '#2563eb', color: '#fff',
                      cursor: isSavingPersona ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600,
                      opacity: isSavingPersona ? 0.7 : 1
                    }}
                  >
                    {isSavingPersona ? 'Salvando...' : 'Salvar Persona'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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