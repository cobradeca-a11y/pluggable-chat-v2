import { useState, useEffect } from 'react';
import { ProviderSettings } from '../lib/types';

interface ActiveModelData {
  provider: string;
  model: string;
  supportedAttachments: string[];
  canText: boolean;
  canImage: boolean;
  canVideo: boolean;
}

export function useActiveModel(providerSettings: ProviderSettings) {
  const [activeModelData, setActiveModelData] = useState<ActiveModelData>({
    provider: providerSettings.provider,
    model: providerSettings.model,
    supportedAttachments: [],
    canText: true,
    canImage: false,
    canVideo: false
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
            const activeProvider = providerSettings.provider || data.active_provider || 'mock';
            const activeModel = providerSettings.model || (data.default_models && data.default_models[activeProvider]) || '';

            const providersList = data.providers || [];
            const providerData = providersList.find((p: any) => p.name === activeProvider) || {};
            const supported: string[] = providerData.supported_attachments || [];

            setActiveModelData({
              provider: activeProvider,
              model: activeModel,
              supportedAttachments: supported,
              canText: providerData.can_text ?? true,
              canImage: providerData.can_image ?? false,
              canVideo: providerData.can_video ?? false
            });
          }
        }
      } catch (error) {
        console.error("Erro ao buscar plugins para modelo ativo:", error);
        if (isMounted) {
          setActiveModelData({
            provider: providerSettings.provider || 'mock',
            model: providerSettings.model || '',
            supportedAttachments: [],
            canText: true,
            canImage: false,
            canVideo: false
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
