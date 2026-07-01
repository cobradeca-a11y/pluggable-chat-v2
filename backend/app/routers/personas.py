from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from supabase import create_client
from app.config import settings
from app.deps import get_current_user_id
from core.registry import get_provider
from core.protocol import Message

router = APIRouter(prefix="/api/personas", tags=["personas"])


def _client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase não configurado no backend")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


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
    client = _client()
    res = client.table("personas").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data


@router.post("", response_model=PersonaOut)
async def create_persona(payload: PersonaCreate, user_id: str = Depends(get_current_user_id)):
    client = _client()
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
    client = _client()
    client.table("personas").delete().eq("id", persona_id).eq("user_id", user_id).execute()
    return {"status": "ok"}


@router.post("/generate", response_model=GenerateResponse)
async def generate_persona(payload: GenerateRequest, user_id: str = Depends(get_current_user_id)):
    """
    Usa o provider padrão (texto) para transformar uma descrição em linguagem
    natural em um system prompt de persona pronto para uso, mais um nome curto.
    """
    provider = get_provider(settings.LLM_PROVIDER)()

    meta_prompt = (
        "Você gera personas (system prompts) para um assistente de IA. "
        "Dada a descrição de necessidade abaixo, responda ESTRITAMENTE no formato:\n"
        "NOME: <nome curto da persona, até 6 palavras>\n"
        "PROMPT: <system prompt completo, em português, definindo tom, especialidade, "
        "e como a persona deve se comportar>\n\n"
        f"Descrição da necessidade: {payload.description}"
    )

    try:
        raw = await provider.complete([Message(role="user", content=meta_prompt)])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Falha ao gerar persona: {e}")

    name = "Persona personalizada"
    system_prompt = raw.strip()

    if "NOME:" in raw and "PROMPT:" in raw:
        try:
            name_part = raw.split("NOME:", 1)[1].split("PROMPT:", 1)[0].strip()
            prompt_part = raw.split("PROMPT:", 1)[1].strip()
            name = name_part or name
            system_prompt = prompt_part or system_prompt
        except Exception:
            pass

    return GenerateResponse(suggested_name=name, system_prompt=system_prompt)
