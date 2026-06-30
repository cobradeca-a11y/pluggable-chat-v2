from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    LLM_PROVIDER: str = "mock"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openrouter/auto:free"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OLLAMA_CLOUD_MODEL: str = "llama3.2:latest"
    CLAUDE_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"
    OPENAI_API_KEY: str = ""

    OPENAI_MODEL: str = "gpt-4o"
    GOOGLE_API_KEY: str = ""
    GOOGLE_MODEL: str = "gemini-1.5-pro"
    ALLOWED_ORIGIN: str = "http://localhost:3000"
    ACTIVE_MIDDLEWARE: str = "rate_limit,request_logger"
    RATE_LIMIT_RPM: int = 100
    SUPABASE_URL: str = "https://eyxlerizjufmttxaahto.supabase.co"
    SUPABASE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5eGxlcml6anVmbXR0eGFhaHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NzA0NTYsImV4cCI6MjA5ODM0NjQ1Nn0.m7mCix-R84q7GuT6h3tdZvxD6cKJLDS4Rhv6qTaJ6-s"
    SUPABASE_SERVICE_ROLE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5eGxlcml6anVmbXR0eGFhaHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mjc3MDQ1NiwiZXhwIjoyMDk4MzQ2NDU2fQ.-HN1qhToJtw2ZlBHPcv16xSbwSOcJNydpt7aHPV9yjo"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
