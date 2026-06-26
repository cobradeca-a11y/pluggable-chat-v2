import { useState, useCallback, useEffect, useRef } from "react";
import { Message, ProviderSettings, ChatRequest } from "../lib/types";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>({
    provider: "",
    model: "",
    apiKey: ""
  });

  const CHAT_STORAGE_KEY = "pluggable_chat_history";
  const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

  // Carregar do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp > TTL_MS) {
          localStorage.removeItem(CHAT_STORAGE_KEY);
        } else if (Array.isArray(parsed.messages)) {
          setMessages(parsed.messages);
        }
      }
      
      const storedSettings = localStorage.getItem("pluggable_chat_settings");
      if (storedSettings) {
        setProviderSettings(JSON.parse(storedSettings));
      }
    } catch (e) {
      console.error("Failed to parse chat history", e);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Salvar no localStorage
  useEffect(() => {
    if (!isInitialized) return;
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({
        timestamp: Date.now(),
        messages
      }));
    } else {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  }, [messages, isInitialized]);

  const clearToast = useCallback(() => setToast(null), []);
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const saveProviderSettings = useCallback((newSettings: ProviderSettings) => {
    setProviderSettings(newSettings);
    localStorage.setItem("pluggable_chat_settings", JSON.stringify(newSettings));
    showToast("Configurações salvas!", "success");
  }, [showToast]);

  const sendMessage = useCallback(
    async (text: string, stream = true) => {
      if (!text.trim()) return;

      const newUserMessage: Message = { role: "user", content: text };
      const currentMessages = [...messages, newUserMessage];
      
      setMessages(currentMessages);
      setInput("");
      setLoading(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://pluggable-chat-v2-production.up.railway.app";
      const endpoint = stream ? "/api/chat/stream" : "/api/chat";

      try {
        // Para ambos os casos (stream ou não), adicionamos o placeholder do assistant
        // assim se der erro, temos uma mensagem para marcar como isError
        setMessages([...currentMessages, { role: "assistant", content: "" }]);

        const payload: ChatRequest = { messages: currentMessages };
        if (providerSettings.provider) {
          payload.provider = providerSettings.provider;
        }
        if (providerSettings.model) {
          payload.model = providerSettings.model;
        }
        if (providerSettings.apiKey && providerSettings.provider === 'openrouter') {
          payload.api_key = providerSettings.apiKey;
        }

        if (stream) {

          const response = await fetch(`${backendUrl}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
          }

          if (!response.body) {
            throw new Error("No response body returned from server.");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let done = false;

          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;

            if (value) {
              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data.trim() === "[DONE]") {
                    break;
                  }

                  // Append data to the last message (the assistant's response)
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMessage = { ...updated[updated.length - 1] };
                    lastMessage.content += data;
                    updated[updated.length - 1] = lastMessage;
                    return updated;
                  });
                }
              }
            }
          }
        } else {
          // Fallback synchronous approach
          const response = await fetch(`${backendUrl}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
          }

          const data = await response.json();
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: data.content };
            return updated;
          });
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log("Geração interrompida pelo usuário");
          return;
        }
        console.error("Failed to send message:", error);
        
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.isError = true;
            if (!lastMsg.content) {
              lastMsg.content = "Ocorreu um erro ao comunicar com o servidor. Verifique se o provedor está ativo.";
            }
          }
          return updated;
        });

        showToast("Falha ao enviar mensagem", "error");
      } finally {
        setLoading(false);
      }
    },
    [messages, showToast, providerSettings]
  );

  const retryLastMessage = useCallback(() => {
    if (loading || messages.length < 2) return;
    
    // Pega as mensagens atuais excluindo o erro e enviando a última mensagem do usuário novamente
    const lastUserIndex = messages.map(m => m.role).lastIndexOf('user');
    if (lastUserIndex !== -1) {
      const userMessage = messages[lastUserIndex].content;
      // Remove mensagens a partir da última do usuário
      setMessages(prev => prev.slice(0, lastUserIndex));
      sendMessage(userMessage);
    }
  }, [messages, loading, sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem("pluggable_chat_history");
  }, []);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return { 
    messages, input, setInput, loading, toast, 
    clearToast, showToast, sendMessage, retryLastMessage, clearChat,
    providerSettings, saveProviderSettings, stopGeneration
  };
}
