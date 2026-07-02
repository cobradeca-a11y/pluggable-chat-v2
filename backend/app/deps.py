from functools import lru_cache
from fastapi import Header, HTTPException
from supabase import create_client, Client
from app.config import settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Client Supabase com a chave anon, usado para operações que devem
    respeitar RLS (ex: validar token de usuário). Instanciado uma única
    vez e reutilizado entre requests (evita reconectar a cada chamada).
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase não configurado no backend")
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


@lru_cache(maxsize=1)
def get_supabase_admin_client() -> Client:
    """
    Client Supabase com a Service Role Key, que ignora RLS. Usado nos
    endpoints que já validam o usuário via JWT (get_current_user_id) e
    filtram por user_id em código Python. Instanciado uma única vez.
    """
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
    if not settings.SUPABASE_URL or not key:
        raise HTTPException(status_code=500, detail="Supabase não configurado no backend")
    return create_client(settings.SUPABASE_URL, key)


async def get_current_user_id(authorization: str = Header(None)) -> str:
    """
    Valida o Bearer token (JWT do Supabase, obtido via login Google no frontend)
    e retorna o user_id. Usado pelos endpoints que precisam saber quem é o usuário.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação ausente")

    token = authorization.removeprefix("Bearer ").strip()

    try:
        client = get_supabase_client()
        res = client.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Token inválido ou expirado")
        return res.user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
