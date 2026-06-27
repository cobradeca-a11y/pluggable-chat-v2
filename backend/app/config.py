from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    LLM_PROVIDER: str = "mock"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "openrouter/auto:free"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    CLAUDE_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    GOOGLE_API_KEY: str = ""
    GOOGLE_MODEL: str = "gemini-1.5-pro"
    RUNWAY_API_KEY: str = ""
    SUNO_API_KEY: str = ""
    MIDJOURNEY_API_KEY: str = ""
    ALLOWED_ORIGIN: str = "http://localhost:3000"
    ACTIVE_MIDDLEWARE: str = "rate_limit,request_logger"
    RATE_LIMIT_RPM: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
