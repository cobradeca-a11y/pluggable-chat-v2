from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.config import settings
from app.deps import get_current_user_id, get_supabase_admin_client
from core.registry import get_provider
from core.protocol import Message

router = APIRouter(prefix="/api/personas", tags=["personas"])


class PersonaCreate(BaseModel):
    name: str
    system_prompt: str


class PersonaOut(BaseModel):
    id: str
    name: str
    system_prompt: str
    created_at: str


class GenerateRequest(BaseModel):
    description: str


class GenerateResponse(BaseModel):
    suggested_name: str
    system_prompt: str


@router.get("", response_model=List[PersonaOut])
async def list_personas(user_id: str = Depends(get_current_user_id)):
    client = get_supabase_admin_client()
    res = client.table("personas").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data


@router.post("", response_model=PersonaOut)
async def create_persona(payload: PersonaCreate, user_id: str = Depends(get_current_user_id)):
    client = get_supabase_admin_client()
    res = client.table("personas").insert({
        "user_id": user_id,
        "name": payload.name,
        "system_prompt": payload.system_prompt,
    }).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Falha ao criar persona")
    return res.data[0]


@router.delete("/{persona_id}")
async def delete_persona(persona_id: str, user_id: str = Depends(get_current_user_id)):
    client = get_supabase_admin_client()
    client.table("personas").delete().eq("id", persona_id).eq("user_id", user_id).execute()
    return {"status": "ok"}


class PersonaUpdate(BaseModel):
    name: str
    system_prompt: str


@router.put("/{persona_id}", response_model=PersonaOut)
async def update_persona(persona_id: str, payload: PersonaUpdate, user_id: str = Depends(get_current_user_id)):
    client = get_supabase_admin_client()
    res = client.table("personas").update({
        "name": payload.name,
        "system_prompt": payload.system_prompt,
    }).eq("id", persona_id).eq("user_id", user_id).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Persona não encontrada ou sem permissão para editar")
    return res.data[0]


@router.post("/generate", response_model=GenerateResponse)
async def generate_persona(payload: GenerateRequest, user_id: str = Depends(get_current_user_id)):
    """
    Usa o provider padrão (texto) para transformar uma descrição em linguagem
    natural em um system prompt de persona pronto para uso, mais um nome curto.
    """
    import json
    import re

    provider_name = settings.LLM_PROVIDER
    provider = get_provider(provider_name)()

    meta_prompt = (
        "Você gera personas (system prompts) para um assistente de IA. "
        "Dada a descrição de necessidade abaixo, responda ESTRITAMENTE com um "
        "objeto JSON válido, sem texto antes ou depois, sem markdown, no formato exato:\n"
        '{"name": "<nome curto da persona, até 6 palavras>", '
        '"system_prompt": "<system prompt completo, em português, definindo tom, '
        'especialidade, e como a persona deve se comportar>"}\n\n'
        f"Descrição da necessidade: {payload.description}"
    )

    try:
        raw = await provider.complete([Message(role="user", content=meta_prompt)])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha ao gerar persona: {e}")

    def _extract_json(text: str) -> str:
        # Remove blocos de código markdown (```json ... ``` ou ``` ... ```)
        # que alguns modelos inserem mesmo quando instruídos a não fazê-lo.
        fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if fenced:
            return fenced.group(1)
        # Ou pega o primeiro objeto { ... } encontrado no texto
        brace = re.search(r"\{.*\}", text, re.DOTALL)
        return brace.group(0) if brace else text

    try:
        parsed = json.loads(_extract_json(raw))
        name = str(parsed.get("name") or "Persona personalizada").strip()
        system_prompt = str(parsed.get("system_prompt") or raw).strip()
    except (json.JSONDecodeError, AttributeError):
        # Fallback: se a IA não devolveu JSON válido, usa o texto bruto
        # como system_prompt para não perder o trabalho gerado.
        name = "Persona personalizada"
        system_prompt = raw.strip()

    return GenerateResponse(suggested_name=name, system_prompt=system_prompt)
