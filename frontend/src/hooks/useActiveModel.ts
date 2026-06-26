import { useState, useEffect } from 'react';
import { ProviderSettings } from '../lib/types';

export function useActiveModel(providerSettings: ProviderSettings) {
  const [activeModelData, setActiveModelData] = useState({
    provider: providerSettings.provider,
    model: providerSettings.model
  });

  useEffect(() => {
    // Se o usuário selecionou algo nas configurações, a prioridade é do local
    if (providerSettings.provider && providerSettings.model) {
      setActiveModelData({
        provider: providerSettings.provider,
        model: providerSettings.model
      });
      return;
    }

    let isMounted = true;

    // Caso não haja configuração local, buscar o padrão pelo endpoint
    const fetchActiveModel = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pluggable-chat-v2-production.up.railway.app';
        const res = await fetch(`${baseUrl}/api/plugins`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            // O fallback garante que mesmo se o endpoint ainda não retornar explicitamente 'provider' e 'model',
            // nós assumimos o padrão do backend (que é o que está em config.py / README).
            setActiveModelData({
              provider: data.provider || data.active_provider || 'openrouter',
              model: data.model || data.active_model || 'openrouter/auto:free'
            });
          }
        }
      } catch (error) {
        console.error("Erro ao buscar plugins para modelo ativo:", error);
      }
    };

    fetchActiveModel();

    return () => {
      isMounted = false;
    };
  }, [providerSettings.provider, providerSettings.model]);

  return activeModelData;
}
