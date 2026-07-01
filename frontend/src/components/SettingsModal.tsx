import React, { useState, useEffect } from 'react';
import { ProviderSettings } from '../lib/types';
import { useAvailableModels } from '../hooks/useAvailableModels';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ProviderSettings;
  onSave: (settings: ProviderSettings) => void;
}

export function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<ProviderSettings>(settings);
  const [providers, setProviders] = useState<any[]>([]);
  const { models: availableModels, loading: modelsLoading } = useAvailableModels(localSettings.provider);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      
      const fetchProviders = async () => {
        try {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://pluggable-chat-v2-production.up.railway.app';
          const res = await fetch(`${baseUrl}/api/plugins`);
          if (res.ok) {
            const data = await res.json();
            setProviders(data.providers || []);
          }
        } catch (err) {
          console.error("Failed to fetch plugins", err);
        }
      };
      fetchProviders();
    }
  }, [isOpen, settings]);

  // Corrige o modelo selecionado se ele não pertencer mais à lista de
  // modelos disponíveis do provider atual (evita salvar combinações
  // inválidas como provider "gemini" + modelo de outro provider).
  useEffect(() => {
    if (!modelsLoading && availableModels.length > 0 && !availableModels.includes(localSettings.model)) {
      setLocalSettings((prev) => ({ ...prev, model: availableModels[0] }));
    }
  }, [availableModels, modelsLoading, localSettings.model]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localSettings);
    onClose();
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as ProviderSettings['provider'];
    
    // Auto-preencher modelo padrão para ajudar o usuário
    let defaultModel = localSettings.model;
    if (provider === 'openrouter' && !defaultModel.includes('openrouter')) {
      defaultModel = 'openrouter/auto:free';
    } else if (provider === 'ollama' && !defaultModel.includes('llama')) {
      defaultModel = 'llama3.2';
    }

    setLocalSettings({ ...localSettings, provider, model: defaultModel });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transition-colors duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 transition-colors duration-300">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 transition-colors duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-zinc-500 dark:text-zinc-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Configurações
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors duration-300">Provider</label>
            <select 
              value={localSettings.provider}
              onChange={handleProviderChange}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors duration-300"
            >
              <option value="">Padrão do Servidor</option>
              {providers.length > 0 ? (
                <>
                  {providers.filter(p => p.can_text).length > 0 && (
                    <optgroup label="Provedores de Texto">
                      {providers.filter(p => p.can_text).map(p => (
                        <option key={`text-${p.name}`} value={p.name}>{p.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {providers.filter(p => p.can_image).length > 0 && (
                    <optgroup label="Provedores de Imagem">
                      {providers.filter(p => p.can_image).map(p => (
                        <option key={`img-${p.name}`} value={p.name}>{p.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {providers.filter(p => p.can_video).length > 0 && (
                    <optgroup label="Provedores de Vídeo">
                      {providers.filter(p => p.can_video).map(p => (
                        <option key={`vid-${p.name}`} value={p.name}>{p.name}</option>
                      ))}
                    </optgroup>
                  )}
                </>
              ) : (
                <>
                  <option value="mock">Mock (Testes)</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama (Local)</option>
                </>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors duration-300">Model</label>
            <select 
              value={localSettings.model}
              onChange={(e) => setLocalSettings({...localSettings, model: e.target.value})}
              disabled={modelsLoading || availableModels.length === 0}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors duration-300"
            >
              {availableModels.length > 0 ? (
                availableModels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))
              ) : (
                <option disabled>{modelsLoading ? "Carregando modelos..." : "Nenhum modelo disponível"}</option>
              )}
            </select>
          </div>

          {localSettings.provider === 'openrouter' && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex justify-between transition-colors duration-300">
                API Key
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-normal">Apenas para o Backend</span>
              </label>
              <input 
                type="password"
                value={localSettings.apiKey}
                onChange={(e) => setLocalSettings({...localSettings, apiKey: e.target.value})}
                placeholder="sk-or-v1-..."
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors duration-300 font-mono"
              />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors duration-300"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
