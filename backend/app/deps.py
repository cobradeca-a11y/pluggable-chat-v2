from fastapi import Header, HTTPException
from supabase import create_client
from app.config import settings


async def get_current_user_id(authorization: str = Header(None)) -> str:
    """
    Valida o Bearer token (JWT do Supabase, obtido via login Google no frontend)
    e retorna o user_id. Usado pelos endpoints que precisam saber quem é o usuário.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token de autenticação ausente")

    token = authorization.removeprefix("Bearer ").strip()

    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase não configurado no backend")

    try:
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        res = client.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Token inválido ou expirado")
        return res.user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
