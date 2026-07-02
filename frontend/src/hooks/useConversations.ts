import { useState, useCallback, useEffect } from "react";
import { Conversation, ConversationsStore, Message, ProviderSettings } from "../lib/types";
import { supabase } from "../lib/supabaseClient";

const STORE_KEY = "pluggable_chat_conversations";
const MAX_CONVERSATIONS = 50;
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Lê a sessão atual do client oficial (já com refresh automático garantido)
async function getAuthContext() {
  const { data: { session } } = await supabase.auth.getSession();
  return { token: session?.access_token ?? null, userId: session?.user?.id ?? null };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carregar dados (Supabase ou LocalStorage)
  useEffect(() => {
    const loadData = async () => {
      const { token, userId } = await getAuthContext();

      if (token && userId) {
        // Autenticado: buscar do Supabase
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/conversations?user_id=eq.${userId}&select=*`, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            // Converter do formato do BD para Conversation[]
            const dbConversations = data.map((d: any) => ({
              id: d.id,
              title: d.title,
              messages: d.messages,
              createdAt: new Date(d.created_at).getTime(),
              updatedAt: new Date(d.created_at).getTime(),
              provider: d.messages[0]?.provider || 'mock',
              model: d.messages[0]?.model || 'mock'
            }));
            
            dbConversations.sort((a: Conversation, b: Conversation) => b.updatedAt - a.updatedAt);
            setConversations(dbConversations);
            
            // Try to set active ID from local storage so we remember where we were
            const stored = localStorage.getItem(STORE_KEY);
            if (stored) {
              const parsed = JSON.parse(stored) as ConversationsStore;
              setActiveId(parsed.activeId || null);
            }
            
            setIsInitialized(true);
            return;
          }
        } catch (e) {
          console.error("Failed to load from Supabase", e);
        }
      }

      // Fallback: carregar do localStorage
      try {
        const stored = localStorage.getItem(STORE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ConversationsStore;
          
          const now = Date.now();
          const validConversations = parsed.conversations.filter(c => {
            const hasUserMessage = c.messages.some(m => m.role === 'user');
            const isNotExpired = now - c.updatedAt <= TTL_MS;
            return hasUserMessage && isNotExpired;
          });

          validConversations.sort((a, b) => b.updatedAt - a.updatedAt);
          setConversations(validConversations.slice(0, MAX_CONVERSATIONS));
          setActiveId(parsed.activeId || null);
        }
      } catch (e) {
        console.error("Failed to parse conversations history", e);
      } finally {
        setIsInitialized(true);
      }
    };
    
    loadData();
  }, []);

  // Salvar no localStorage (activeId) e gerenciar debounce para Supabase/LocalStorage
  useEffect(() => {
    if (!isInitialized) return;

    const timer = setTimeout(() => {
      const valid = conversations.filter(c => c.messages.some(m => m.role === 'user'));
      
      // Save local active ID and offline fallback
      if (valid.length > 0) {
        localStorage.setItem(STORE_KEY, JSON.stringify({
          conversations: valid,
          activeId
        }));
      } else {
        localStorage.removeItem(STORE_KEY);
      }
    }, 500); // debounce
    return () => clearTimeout(timer);
  }, [conversations, activeId, isInitialized]);

  const activeConversation = conversations.find(c => c.id === activeId) || null;

  const createConversation = useCallback(() => {
    const id = crypto.randomUUID();
    setActiveId(id);
    return id;
  }, []);

  const loadConversation = useCallback((id: string) => {
    if (conversations.some(c => c.id === id)) {
      setActiveId(id);
    }
  }, [conversations]);

  const generateTitle = useCallback((firstUserMessage: string): string => {
    const clean = firstUserMessage.trim().replace(/\n/g, ' ');
    return clean.length > 40 ? clean.slice(0, 40) + '…' : clean;
  }, []);

  const syncToSupabase = async (conversation: Conversation) => {
    const { token, userId } = await getAuthContext();
    
    if (token && userId) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/conversations`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            id: conversation.id,
            user_id: userId,
            title: conversation.title,
            messages: conversation.messages,
            created_at: new Date(conversation.createdAt).toISOString()
          })
        });
      } catch (e) {
        console.error("Failed to sync to Supabase", e);
      }
    }
  };

  const saveConversation = useCallback((id: string, messages: Message[], settings: ProviderSettings) => {
    setConversations(prev => {
      const existingIdx = prev.findIndex(c => c.id === id);
      const now = Date.now();
      
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length === 0) {
          return prev;
      }

      let title = "Nova Conversa";
      let targetConversation: Conversation;
      
      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        title = existing.title && existing.title !== "Nova Conversa" 
                  ? existing.title 
                  : generateTitle(userMessages[0].content);
        
        targetConversation = {
          ...existing,
          title,
          updatedAt: now,
          messages,
          provider: settings.provider,
          model: settings.model
        };
        
        const updatedList = [...prev];
        updatedList[existingIdx] = targetConversation;
        updatedList.sort((a, b) => b.updatedAt - a.updatedAt);
        
        // Async sync
        syncToSupabase(targetConversation);
        
        return updatedList.slice(0, MAX_CONVERSATIONS);
      } else {
        title = generateTitle(userMessages[0].content);
        targetConversation = {
          id,
          title,
          createdAt: now,
          updatedAt: now,
          messages,
          provider: settings.provider,
          model: settings.model
        };
        
        const updatedList = [targetConversation, ...prev];
        updatedList.sort((a, b) => b.updatedAt - a.updatedAt);
        
        // Async sync
        syncToSupabase(targetConversation);
        
        return updatedList.slice(0, MAX_CONVERSATIONS);
      }
    });
  }, [generateTitle]);

  const deleteConversation = useCallback(async (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
    }
    
    // Delete from Supabase
    const { token, userId } = await getAuthContext();
    if (token && userId) {
      fetch(`${SUPABASE_URL}/rest/v1/conversations?id=eq.${id}&user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`
        }
      }).catch(console.error);
    }
  }, [activeId]);

  const renameConversation = useCallback((id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    
    setConversations(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, title: newTitle.trim(), updatedAt: Date.now() } : c);
      
      // Async sync
      const target = updated.find(c => c.id === id);
      if (target) {
        syncToSupabase(target);
      }
      
      return updated;
    });
  }, []);

  return {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    loadConversation,
    saveConversation,
    deleteConversation,
    renameConversation,
    generateTitle
  };
}
