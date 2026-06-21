from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env from the repo root regardless of the process cwd.
_REPO_ROOT = Path(__file__).parents[3]
_ENV_FILE = str(_REPO_ROOT / ".env")


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    database_url: str  # postgresql+psycopg://... (Alembic/SQLAlchemy format)

    model_config = SettingsConfigDict(env_file=(_ENV_FILE, ".env"), extra="ignore")

    @property
    def postgres_dsn(self) -> str:
        # psycopg3 uses the plain postgresql:// scheme; strip the driver hint.
        return self.database_url.replace("postgresql+psycopg://", "postgresql://", 1)


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # fields populated from env by pydantic-settings
