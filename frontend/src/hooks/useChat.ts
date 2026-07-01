import { useState, useCallback, useEffect, useRef } from "react";
import { Message, ProviderSettings, ChatRequest, Attachment } from "../lib/types";
import { useConversations } from "./useConversations";
import { usePersonas } from "./usePersonas";

export function useChat() {
  const conv = useConversations();
  const personas = usePersonas();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>({
    provider: "",
    model: "",
    apiKey: ""
  });

  const isSwitchingRef = useRef(false);
  const suppressNextResetRef = useRef(false);

  // Load conversation messages when activeId changes
  useEffect(() => {
    if (suppressNextResetRef.current) {
      // Uma nova conversa foi criada dentro de sendMessage, que já está
      // gerenciando o array de mensagens manualmente; não sobrescrever.
      suppressNextResetRef.current = false;
      return;
    }
    if (conv.activeId) {
      isSwitchingRef.current = true;
      setMessages(conv.activeConversation?.messages || []);
      // Reset after render
      setTimeout(() => { isSwitchingRef.current = false; }, 0);
    } else {
      setMessages([]);
    }
  }, [conv.activeId]); // Depend on activeId intentionally, avoid activeConversation loops

  // Save conversation messages when they change
  const activeId = conv.activeId;
  const saveConversation = conv.saveConversation;
  useEffect(() => {
    if (!isSwitchingRef.current && messages.length > 0 && activeId) {
      saveConversation(activeId, messages, providerSettings);
    }
  }, [messages, providerSettings, activeId, saveConversation]);

  // Carregar configurações
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem("pluggable_chat_settings");
      if (storedSettings) {
        setProviderSettings(JSON.parse(storedSettings));
      }
    } catch (e) {
      console.error("Failed to parse settings", e);
    }
  }, []);

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
    async (text: string, stream = true, attachment?: Attachment, mode?: string) => {
      if (!text.trim()) return;

      if (!conv.activeId) {
        conv.createConversation();
      }

      const MEMORY_WINDOW = 20;

      const newUserMessage: Message = { role: "user", content: text };
      if (attachment) {
        newUserMessage.attachment = attachment;
      }
      const allMessages = [...messages, newUserMessage];
      // Limita ao window de memória para o payload enviado ao backend
      const contextMessages = allMessages.slice(-MEMORY_WINDOW);
      
      setMessages(allMessages);
      setInput("");
      setLoading(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://pluggable-chat-v2-production.up.railway.app";
      const endpoint = stream ? "/api/chat/stream" : "/api/chat";

      try {
        // Para ambos os casos (stream ou não), adicionamos o placeholder do assistant
        // assim se der erro, temos uma mensagem para marcar como isError
        setMessages([...allMessages, { role: "assistant", content: "" }]);

        if (mode === "image") {
          const imagePayload: any = { prompt: text };
          if (providerSettings.provider) imagePayload.provider = providerSettings.provider;
          if (providerSettings.model) imagePayload.model = providerSettings.model;
          if (providerSettings.apiKey && providerSettings.provider === 'openrouter') {
            imagePayload.api_key = providerSettings.apiKey;
          }

          const response = await fetch(`${backendUrl}/api/generate/image`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(imagePayload),
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
          }

          const data = await response.json();
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: data.content, type: data.type || "image_url" };
            return updated;
          });
          return;
        }

        if (mode === "video") {
          const videoPayload: any = { prompt: text };
          if (providerSettings.provider) videoPayload.provider = providerSettings.provider;
          if (providerSettings.model) videoPayload.model = providerSettings.model;
          if (providerSettings.apiKey && providerSettings.provider === 'openrouter') {
            videoPayload.api_key = providerSettings.apiKey;
          }

          const response = await fetch(`${backendUrl}/api/generate/video`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(videoPayload),
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
          }

          const data = await response.json();
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: data.job_id, type: "video_generation" };
            return updated;
          });
          return;
        }

        const payload: ChatRequest = { messages: contextMessages };
        if (personas.activePersona?.system_prompt) {
          payload.messages = [
            { role: "system", content: personas.activePersona.system_prompt },
            ...contextMessages,
          ];
        }
        if (attachment) {
          payload.attachment = attachment;
        }
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
    [messages, showToast, providerSettings, personas.activePersona]
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
    conv.createConversation();
    setMessages([]);
  }, [conv]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return { 
    messages, input, setInput, loading, toast, 
    clearToast, showToast, sendMessage, retryLastMessage, clearChat,
    providerSettings, saveProviderSettings, stopGeneration,
    conversations: conv,
    personas
  };
}
