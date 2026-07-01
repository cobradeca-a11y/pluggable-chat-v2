import React, { useState } from "react";
import { usePersonas, Persona } from "../hooks/usePersonas";

interface PersonaSelectorProps {
  personasHook: ReturnType<typeof usePersonas>;
}

export function PersonaSelector({ personasHook }: PersonaSelectorProps) {
  const { personas, activePersonaId, selectPersona, savePersona, deletePersona, generatePersona } = personasHook;
  const [isCreating, setIsCreating] = useState(false);
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<{ suggested_name: string; system_prompt: string } | null>(null);
  const [nameOverride, setNameOverride] = useState("");

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    const result = await generatePersona(description);
    setGenerating(false);
    if (result) {
      setPreview(result);
      setNameOverride(result.suggested_name);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    const persona = await savePersona(nameOverride || preview.suggested_name, preview.system_prompt);
    if (persona) {
      selectPersona(persona.id);
      setIsCreating(false);
      setPreview(null);
      setDescription("");
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={activePersonaId}
        onChange={(e) => selectPersona(e.target.value)}
        className="text-xs bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-md px-2 py-1"
      >
        <option value="">Sem persona</option>
        {personas.map((p: Persona) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {activePersonaId && (
        <button
          onClick={() => deletePersona(activePersonaId)}
          className="text-xs text-red-400 hover:text-red-300"
          title="Excluir persona ativa"
        >
          Excluir
        </button>
      )}

      <button
        onClick={() => setIsCreating(true)}
        className="text-xs text-blue-400 hover:text-blue-300"
      >
        + Criar Persona
      </button>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setIsCreating(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-zinc-100 mb-3">Criar nova Persona</h3>

            {!preview ? (
              <>
                <p className="text-xs text-zinc-400 mb-2">Descreva o que você precisa (ex: "analista técnico em contratações públicas"):</p>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  placeholder="Ex: preciso de um revisor jurídico especialista em Lei 14.133/2021"
                />
                <button
                  onClick={handleGenerate}
                  disabled={generating || !description.trim()}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm py-2 rounded-lg"
                >
                  {generating ? "Gerando..." : "Gerar Persona"}
                </button>
              </>
            ) : (
              <>
                <label className="text-xs text-zinc-400">Nome</label>
                <input
                  value={nameOverride}
                  onChange={(e) => setNameOverride(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 mb-2"
                />
                <label className="text-xs text-zinc-400">System Prompt (revise se quiser)</label>
                <textarea
                  value={preview.system_prompt}
                  onChange={(e) => setPreview({ ...preview, system_prompt: e.target.value })}
                  rows={6}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setPreview(null)} className="flex-1 text-sm py-2 rounded-lg border border-zinc-700 text-zinc-300">
                    Voltar
                  </button>
                  <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded-lg">
                    Salvar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
