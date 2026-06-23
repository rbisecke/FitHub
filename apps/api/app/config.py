from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# In the monorepo .env lives 4 levels up (repo/apps/api/app/config.py).
# In Docker the file is only 3 levels deep (/app/app/config.py); fall back
# gracefully — Railway injects env vars directly so no .env is needed.
_THIS = Path(__file__)
_REPO_ROOT = _THIS.parents[3] if len(_THIS.parents) > 3 else _THIS.parent
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
