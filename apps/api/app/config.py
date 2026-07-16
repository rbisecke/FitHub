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
    anthropic_monthly_budget_usd: float = 5.0
    # ADMIN_USER_IDS_CSV: comma-separated admin UUIDs for the backend.
    # The frontend also reads ADMIN_USER_IDS (same values) — see apps/web/app/(admin)/layout.tsx.
    # Keep both in sync when adding or removing admins.
    # Stored as str so pydantic-settings doesn't try to JSON-decode the value;
    # parse with admin_user_ids property.
    admin_user_ids_csv: str = ""
    # Comma-separated allowed CORS origins. Production: set to the public frontend URL.
    cors_origin: str = "http://localhost:3000"
    # Infra monitoring collectors (app/jobs/infra_collectors.py) — all optional.
    # Each collector logs a debug message and returns early if the fields it
    # needs are unset, so these can stay blank until a platform's credentials
    # are provisioned.
    supabase_project_ref: str = (
        ""  # optional; derived from supabase_url if blank — see supabase_ref
    )
    vercel_token: str = ""  # Personal Access Token — vercel.com/account/tokens
    vercel_project_id: str = ""  # prj_xxx
    vercel_team_id: str = ""  # team_xxx; only required if the project is under a Vercel team
    railway_token: str = ""  # Account token — Railway → Account Settings → Tokens
    railway_project_id: str = ""
    railway_service_id: str = ""  # the API service specifically
    railway_environment_id: str = ""  # production environment

    model_config = SettingsConfigDict(env_file=(_ENV_FILE, ".env"), extra="ignore")

    @property
    def admin_user_ids(self) -> list[str]:
        return [x.strip() for x in self.admin_user_ids_csv.split(",") if x.strip()]

    @property
    def postgres_dsn(self) -> str:
        # psycopg3 uses the plain postgresql:// scheme; strip the driver hint.
        return self.database_url.replace("postgresql+psycopg://", "postgresql://", 1)

    @property
    def supabase_ref(self) -> str:
        # Project ref extracted from supabase_url (https://<ref>.supabase.co)
        # so we don't need a redundant env var in the common case.
        if self.supabase_project_ref:
            return self.supabase_project_ref
        try:
            return self.supabase_url.split("//")[1].split(".")[0]
        except IndexError, AttributeError:
            return ""


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # fields populated from env by pydantic-settings
