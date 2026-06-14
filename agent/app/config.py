"""Runtime configuration loaded from environment variables / .env."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Provider: auto | anthropic | groq | stub
    llm_provider: str = "auto"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-6"

    groq_api_key: str = ""
    groq_model: str = "meta-llama/llama-4-maverick-17b-128e-instruct"

    request_timeout: int = 120
    allowed_origins: str = "http://localhost:3000"

    def resolved_provider(self) -> str:
        """Resolve 'auto' to a concrete provider based on available keys."""
        provider = (self.llm_provider or "auto").lower().strip()
        if provider != "auto":
            return provider
        if self.anthropic_api_key:
            return "anthropic"
        if self.groq_api_key:
            return "groq"
        return "stub"

    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
