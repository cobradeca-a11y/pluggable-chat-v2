import React from 'react';
import { Conversation } from '../lib/types';
import { useTheme } from '../hooks/useTheme';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, isOpen, onClose }: SidebarProps) {
  const { theme } = useTheme();

  return (
    <>
      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div 
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: 'fixed', // Fixed for simple responsive, or use flex in page.tsx
        top: 0,
        left: 0,
        height: '100vh',
        width: 260,
        backgroundColor: theme === 'dark' ? '#09090b' : '#fafafa',
        borderRight: theme === 'dark' ? '1px solid #27272a' : '1px solid #e4e4e7',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease-in-out',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={onNew}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: theme === 'dark' ? '#27272a' : '#f4f4f5',
              color: theme === 'dark' ? '#f4f4f5' : '#18181b',
              cursor: 'pointer',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>+</span> Nova Conversa
          </button>
          
          <button 
            onClick={onClose}
            style={{
              marginLeft: 12,
              padding: '8px',
              background: 'transparent',
              border: 'none',
              color: '#71717a',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
          {conversations.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 40, color: '#71717a', fontSize: 13 }}>
              Nenhuma conversa ainda.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {conversations.map(conv => (
                <div 
                  key={conv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    backgroundColor: activeId === conv.id 
                      ? (theme === 'dark' ? '#27272a' : '#e4e4e7') 
                      : 'transparent',
                    color: activeId === conv.id
                      ? (theme === 'dark' ? '#f4f4f5' : '#18181b')
                      : '#71717a'
                  }}
                  onClick={() => {
                    onSelect(conv.id);
                    // No mobile fechar ao selecionar
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                >
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
                    {conv.title}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#a1a1aa',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Excluir"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
