import { useState, useEffect } from 'react';

export function useAvailableModels(provider: string) {
  const [models, setModels] = useState<string[]>([]);
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider) {
      setModels([]);
      setCategories({});
      return;
    }

    let isMounted = true;
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pluggable-chat-v2-production.up.railway.app';
    
    fetch(`${baseUrl}/api/plugins/${provider}/models`)
      .then(r => r.json())
      .then(data => {
        if (isMounted) {
          setModels(data.models || []);
          setCategories(data.categories || {});
        }
      })
      .catch(err => {
        console.error(`Erro ao buscar modelos de ${provider}:`, err);
        if (isMounted) {
          setModels([]);
          setCategories({});
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
      
    return () => {
      isMounted = false;
    };
  }, [provider]);

  return { models, categories, loading };
}
