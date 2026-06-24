import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/oauth/callback"
    MANUAL_APPROVAL_DEFAULT: bool = True
    SLACK_WEBHOOK_URL: str = "https://hooks.slack.com/services/REPLACE_ME"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gemma3:4b"
    OWNER_EMAIL: str = "kbvirgonaut2004@gmail.com"  # Calendar invites sent here

    # Base folder path
    DATA_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "data"))
    PARENT_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

@lru_cache()
def get_settings() -> Settings:
    return Settings()
