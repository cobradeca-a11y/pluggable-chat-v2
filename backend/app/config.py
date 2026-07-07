from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    LLM_PROVIDER: str = "ollama-cloud"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openai/gpt-oss-120b:free"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OLLAMA_CLOUD_MODEL: str = "gpt-oss:120b-cloud"
    OLLAMA_API_KEY: str = ""

    ALLOWED_ORIGIN: str = "http://localhost:3000"
    ACTIVE_MIDDLEWARE: str = "rate_limit,request_logger"
    RATE_LIMIT_RPM: int = 100
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    TAVILY_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
