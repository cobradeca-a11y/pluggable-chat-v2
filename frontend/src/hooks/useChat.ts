import { useState, useCallback, useEffect, useRef } from "react";
import { Message, ProviderSettings, ChatRequest, Attachment } from "../lib/types";
import { useConversations } from "./useConversations";
import { usePersonas } from "./usePersonas";
import { authFetch } from "../lib/authFetch";

export function useChat() {
  const conv = useConversations();
  const personas = usePersonas();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [providerSettings, setProviderSettings] = useState<ProviderSettings>({
    provider: "gemini",
    model: "gemini-3.5-flash",
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
        const parsed = JSON.parse(storedSettings);
        if (parsed.provider) {
          setProviderSettings(parsed);
        }
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
        suppressNextResetRef.current = true;
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

          const response = await authFetch(`${backendUrl}/api/generate/image`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(imagePayload),
            signal: controller.signal
          });

          if (!response.ok) {
            const err = new Error(`HTTP_ERROR_${response.status}`);
            (err as any).status = response.status;
            try { (err as any).body = await response.json(); } catch(e) {}
            throw err;
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

          const response = await authFetch(`${backendUrl}/api/generate/video`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(videoPayload),
            signal: controller.signal
          });

          if (!response.ok) {
            const err = new Error(`HTTP_ERROR_${response.status}`);
            (err as any).status = response.status;
            try { (err as any).body = await response.json(); } catch(e) {}
            throw err;
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

        if (stream) {

          const response = await authFetch(`${backendUrl}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          if (!response.ok) {
            const err = new Error(`HTTP_ERROR_${response.status}`);
            (err as any).status = response.status;
            try { (err as any).body = await response.json(); } catch(e) {}
            throw err;
          }

          if (!response.body) {
            throw new Error("No response body returned from server.");
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let done = false;
          let buffer = "";

          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;

            if (value) {
              buffer += decoder.decode(value, { stream: true });
            }

            const lines = buffer.split("\n");
            
            if (!done) {
              buffer = lines.pop() || "";
            } else {
              buffer = "";
            }

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const data = line.slice(6);
                  if (data.trim() === "[DONE]") {
                    break;
                  }

                  if (data.startsWith("[ERROR]")) {
                    const errPayload = data.replace("[ERROR]", "").trim();
                    let friendlyMsg = "Ocorreu um erro inesperado.";
                    try {
                      const parsed = JSON.parse(errPayload);
                      const provider = parsed.provider || providerSettings.provider || "provedor";
                      const status = parsed.status;
                      
                      if (status === 401 || status === 403) {
                         friendlyMsg = `Falha de autenticação no ${provider}. Verifique sua chave de API nas configurações.`;
                      } else if (status === 429) {
                         friendlyMsg = `Limite de requisições excedido no ${provider} (Rate Limit). Tente novamente em alguns instantes.`;
                      } else if (status === 0 || status === 504) {
                         friendlyMsg = `O ${provider} demorou muito para responder (Timeout) ou ocorreu falha de rede. Tente novamente.`;
                      } else if (status >= 500) {
                         friendlyMsg = `O ${provider} retornou um erro interno (${status}). Tente novamente ou mude de modelo.`;
                      } else {
                         friendlyMsg = `O ${provider} retornou um erro inesperado (${status}).`;
                      }
                    } catch(e) {
                      friendlyMsg = "Falha ao processar a resposta do provedor.";
                    }
                    
                    setMessages((prev) => {
                      const updated = [...prev];
                      const lastMessage = { ...updated[updated.length - 1] };
                      lastMessage.content = friendlyMsg;
                      lastMessage.isError = true;
                      updated[updated.length - 1] = lastMessage;
                      return updated;
                    });
                    continue;
                  }

                  // Append data to the last message (the assistant's response)
                  let parsedDelta = "";
                  try {
                    const parsed = JSON.parse(data);
                    if (parsed.delta !== undefined) {
                      parsedDelta = parsed.delta;
                    } else {
                      parsedDelta = data;
                    }
                  } catch (e) {
                    parsedDelta = data; // Fallback se não for JSON válido
                  }

                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMessage = { ...updated[updated.length - 1] };
                    lastMessage.content += parsedDelta;
                    updated[updated.length - 1] = lastMessage;
                    return updated;
                  });
                }
              }
            }
        } else {
          // Fallback synchronous approach
          const response = await authFetch(`${backendUrl}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const err = new Error(`HTTP_ERROR_${response.status}`);
            (err as any).status = response.status;
            try { (err as any).body = await response.json(); } catch(e) {}
            throw err;
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
        
        let friendlyMsg = "Ocorreu um erro ao comunicar com o servidor. Verifique se o provedor está ativo.";
        const provider = providerSettings.provider || "provedor";

        if (error.status) {
           const status = error.status;
           if (status === 401 || status === 403) {
             if (error.body?.detail?.error_type === "session_expired") {
               friendlyMsg = "Sua sessão expirou. Faça login novamente.";
             } else {
               friendlyMsg = `Falha de autenticação no ${provider}. Verifique sua chave de API nas configurações.`;
             }
           } else if (status === 429) {
             friendlyMsg = `Limite de requisições excedido no ${provider} (Rate Limit). Tente novamente em alguns instantes.`;
           } else if (status >= 500) {
             friendlyMsg = `O ${provider} retornou um erro interno (${status}). Tente novamente ou mude de modelo.`;
           } else {
             friendlyMsg = `O ${provider} retornou um erro inesperado (${status}).`;
           }
        } else if (error.message && (error.message.includes('fetch') || error.message.includes('Network'))) {
           friendlyMsg = "Falha de rede ou servidor inacessível. Verifique sua conexão.";
        }

        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.isError = true;
            lastMsg.content = friendlyMsg;
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
