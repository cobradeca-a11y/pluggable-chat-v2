import { useState, useEffect, useCallback } from "react";

export interface Persona {
  id: string;
  name: string;
  system_prompt: string;
  created_at: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://pluggable-chat-v2-production.up.railway.app";

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("pluggable_auth_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function usePersonas() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchPersonas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/personas`, { headers: authHeaders() });
      if (res.ok) {
        setPersonas(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch personas", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("pluggable_active_persona");
    if (saved) setActivePersonaId(saved);
    fetchPersonas();
  }, [fetchPersonas]);

  const selectPersona = (id: string) => {
    setActivePersonaId(id);
    localStorage.setItem("pluggable_active_persona", id);
  };

  const savePersona = async (name: string, systemPrompt: string): Promise<Persona | null> => {
    try {
      const res = await fetch(`${BASE_URL}/api/personas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name, system_prompt: systemPrompt }),
      });
      if (res.ok) {
        const persona = await res.json();
        await fetchPersonas();
        return persona;
      }
    } catch (e) {
      console.error("Failed to save persona", e);
    }
    return null;
  };

  const deletePersona = async (id: string) => {
    try {
      await fetch(`${BASE_URL}/api/personas/${id}`, { method: "DELETE", headers: authHeaders() });
      if (activePersonaId === id) selectPersona("");
      await fetchPersonas();
    } catch (e) {
      console.error("Failed to delete persona", e);
    }
  };

  const generatePersona = async (description: string): Promise<{ suggested_name: string; system_prompt: string } | null> => {
    try {
      const res = await fetch(`${BASE_URL}/api/personas/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ description }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error("Failed to generate persona", e);
    }
    return null;
  };

  const activePersona = personas.find((p) => p.id === activePersonaId) || null;

  return { personas, activePersona, activePersonaId, selectPersona, savePersona, deletePersona, generatePersona, loading };
}
