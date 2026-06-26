import { useState, useCallback, useEffect } from "react";
import { Conversation, ConversationsStore, Message, ProviderSettings } from "../lib/types";

const STORE_KEY = "pluggable_chat_conversations";
const MAX_CONVERSATIONS = 50;
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 dias

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carregar do localStorage na inicialização
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ConversationsStore;
        
        const now = Date.now();
        // Filtra conversas expiradas e sem mensagens do usuário
        const validConversations = parsed.conversations.filter(c => {
          const hasUserMessage = c.messages.some(m => m.role === 'user');
          const isNotExpired = now - c.updatedAt <= TTL_MS;
          return hasUserMessage && isNotExpired;
        });

        // Ordena por data de atualização (descendente) e aplica limite
        validConversations.sort((a, b) => b.updatedAt - a.updatedAt);
        const limitedConversations = validConversations.slice(0, MAX_CONVERSATIONS);

        setConversations(limitedConversations);
        setActiveId(parsed.activeId || null);
      }
    } catch (e) {
      console.error("Failed to parse conversations history", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Salvar no localStorage sempre que houver alteração
  useEffect(() => {
    if (!isInitialized) return;
    
    // Só salva conversas com mensagens de usuário
    const valid = conversations.filter(c => c.messages.some(m => m.role === 'user'));
    
    if (valid.length > 0) {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        conversations: valid,
        activeId
      }));
    } else {
      localStorage.removeItem(STORE_KEY);
    }
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

  const saveConversation = useCallback((id: string, messages: Message[], settings: ProviderSettings) => {
    setConversations(prev => {
      const existingIdx = prev.findIndex(c => c.id === id);
      const now = Date.now();
      
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length === 0) {
          return prev; // Ignora se não há mensagem de usuário
      }

      let title = "Nova Conversa";
      
      if (existingIdx >= 0) {
        // Atualiza conversa existente
        const existing = prev[existingIdx];
        
        // Só tenta gerar o título se o anterior não tinha, ou se era padrão
        // (Isso impede de regravar títulos toda vez, embora nesse design não dê pra editar na mão)
        title = existing.title && existing.title !== "Nova Conversa" 
                  ? existing.title 
                  : generateTitle(userMessages[0].content);
        
        const updatedConversation: Conversation = {
          ...existing,
          title,
          updatedAt: now,
          messages,
          provider: settings.provider,
          model: settings.model
        };
        
        const updatedList = [...prev];
        updatedList[existingIdx] = updatedConversation;
        updatedList.sort((a, b) => b.updatedAt - a.updatedAt);
        return updatedList.slice(0, MAX_CONVERSATIONS);
      } else {
        // Cria nova conversa
        title = generateTitle(userMessages[0].content);
        const newConversation: Conversation = {
          id,
          title,
          createdAt: now,
          updatedAt: now,
          messages,
          provider: settings.provider,
          model: settings.model
        };
        
        const updatedList = [newConversation, ...prev];
        updatedList.sort((a, b) => b.updatedAt - a.updatedAt);
        return updatedList.slice(0, MAX_CONVERSATIONS);
      }
    });
  }, [generateTitle]);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) {
      setActiveId(null);
    }
  }, [activeId]);

  return {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    loadConversation,
    saveConversation,
    deleteConversation,
    generateTitle
  };
}
