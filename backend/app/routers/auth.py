from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])

def get_supabase() -> Client:
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        # Mock logic for tests and dev without supabase
        class MockAuth:
            def sign_in_with_otp(self, dict_params):
                return {"message": "mock_otp_sent"}
            def verify_otp(self, dict_params):
                return {"session": {"access_token": "mock_token", "user": {"id": "mock_user_123"}}}
        class MockClient:
            auth = MockAuth()
        return MockClient()  # type: ignore
    
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

class EmailRequest(BaseModel):
    email: str

class VerifyRequest(BaseModel):
    email: str
    token: str

@router.post("/send-link")
async def send_magic_link(request: EmailRequest):
    supabase = get_supabase()
    try:
        # We redirect back to our frontend /login?verify=true
        supabase.auth.sign_in_with_otp({
            "email": request.email,
            "options": {
                "email_redirect_to": f"{settings.ALLOWED_ORIGIN}/login"
            }
        })
        return {"status": "ok", "message": "Magic link sent if email is valid"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verify")
async def verify_link(request: VerifyRequest):
    supabase = get_supabase()
    try:
        res = supabase.auth.verify_otp({
            "email": request.email,
            "token": request.token,
            "type": "magiclink"
        })
        if not hasattr(res, "session") or not res.session:
            # Maybe it's a mock
            if isinstance(res, dict) and "session" in res:
                return {"status": "ok", "session": res["session"]}
            raise HTTPException(status_code=401, detail="Invalid session")
            
        return {
            "status": "ok", 
            "session": {
                "access_token": res.session.access_token,
                "user_id": res.session.user.id
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
