import { useState, useEffect } from 'react';
import { ProviderSettings } from '../lib/types';

interface ActiveModelData {
  provider: string;
  model: string;
  supportedAttachments: string[];
}

export function useActiveModel(providerSettings: ProviderSettings) {
  const [activeModelData, setActiveModelData] = useState<ActiveModelData>({
    provider: providerSettings.provider,
    model: providerSettings.model,
    supportedAttachments: []
  });

  useEffect(() => {
    let isMounted = true;

    const fetchCapabilities = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pluggable-chat-v2-production.up.railway.app';
        const res = await fetch(`${baseUrl}/api/plugins`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            // Determina qual provider está ativo (prioridade: settings local > backend)
            const activeProvider = providerSettings.provider || data.active_provider || 'mock';
            const activeModel = providerSettings.model || data.active_model || '';

            // Busca supported_attachments do provider ativo
            const capabilities = data.capabilities || {};
            const providerCaps = capabilities[activeProvider] || {};
            const supported: string[] = providerCaps.supported_attachments || [];

            setActiveModelData({
              provider: activeProvider,
              model: activeModel,
              supportedAttachments: supported
            });
          }
        }
      } catch (error) {
        console.error("Erro ao buscar plugins para modelo ativo:", error);
        // Fallback: usa settings locais sem capabilities
        if (isMounted) {
          setActiveModelData({
            provider: providerSettings.provider || 'mock',
            model: providerSettings.model || '',
            supportedAttachments: []
          });
        }
      }
    };

    fetchCapabilities();

    return () => {
      isMounted = false;
    };
  }, [providerSettings.provider, providerSettings.model]);

  return activeModelData;
}
