"""Runtime configuration, loaded once from the environment.

Everything the application needs to know about the machine it is running on lives
here and nowhere else. `app/domain/` never imports this module — import-linter
fails the build if it does — which is what keeps the scoring logic testable
without an environment.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parent.parent


class ConfigurationError(RuntimeError):
    """Raised at startup when the environment is unsafe to serve from."""


class Settings(BaseSettings):
    """Environment-backed settings. See `.env.example` for the documented template."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Signal Atlas"
    app_version: str = "0.1.0"
    debug: bool = False

    # --- Bright Data CLI ---------------------------------------------------
    # The CLI keeps its own credentials after `brightdata login`; the key here is
    # for CI and non-interactive runs only.
    brightdata_api_key: str = ""
    brightdata_unlocker_zone: str = "cli_unlocker"
    bdata_binary: str = "brightdata"

    # Timeouts in seconds. The CLI's own defaults are 600 s for run/heal/approve,
    # so these sit just above them: a client-side timeout that fires before the
    # server-side one turns a slow heal into a phantom failure.
    cli_run_timeout: float = 660.0
    cli_heal_timeout: float = 660.0
    cli_approve_timeout: float = 660.0

    # AI-Flow allows 3 concurrent create/heal jobs per account. One keeps a live
    # demo deterministic and leaves headroom for manual CLI use during judging.
    cli_max_concurrency: int = 1

    # --- Auth --------------------------------------------------------------
    admin_api_key: str = ""

    # --- Copilot (AI assistant) -------------------------------------------
    groq_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    copilot_provider: str = "groq"
    copilot_model: str = "openai/gpt-oss-120b"
    copilot_max_tool_iterations: int = 8

    # --- Storage -----------------------------------------------------------
    database_url: str = "sqlite+aiosqlite:///./signals.db"
    raw_payload_dir: Path = Path("data/raw")

    # --- HTTP --------------------------------------------------------------
    # Comma-separated rather than a JSON list: a JSON-typed field makes a
    # malformed .env fail with a parse error nobody can read.
    frontend_origins: str = "http://localhost:5173,http://localhost:3000"

    # --- Collectors --------------------------------------------------------
    registry_path: Path = Field(default=PROJECT_ROOT / "collectors" / "registry.yaml")
    fixture_base_url: str = ""

    # --- Quality thresholds -------------------------------------------------
    fill_rate_threshold: float = 0.8

    @field_validator("fill_rate_threshold")
    @classmethod
    def _threshold_in_range(cls, value: float) -> float:
        if not 0.0 < value <= 1.0:
            raise ValueError("fill_rate_threshold must be in (0, 1]")
        return value

    @field_validator("cli_max_concurrency")
    @classmethod
    def _concurrency_within_account_cap(cls, value: int) -> int:
        if not 1 <= value <= 3:
            raise ValueError("cli_max_concurrency must be 1..3 (Bright Data AI-Flow cap is 3)")
        return value

    @property
    def cors_origins(self) -> list[str]:
        """Allowed browser origins, parsed from the comma-separated setting.

        Deliberately never `["*"]`: the app sends no credentials, but a wildcard
        would also invite one to be added later without anyone noticing.
        """
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]

    def ensure_serving_is_safe(self) -> None:
        """Fail fast on a configuration that would expose the admin routes.

        Called from the app factory rather than at import time so that tests and
        tooling can construct `Settings` freely.
        """
        if not self.admin_api_key.strip():
            raise ConfigurationError(
                "ADMIN_API_KEY is empty. POST /run, /heal and /approve trigger real "
                "Bright Data jobs; refusing to start with them unauthenticated."
            )
        if len(self.admin_api_key) < 16:
            raise ConfigurationError(
                "ADMIN_API_KEY is shorter than 16 characters. Generate one with: "
                'py -3.12 -c "import secrets; print(secrets.token_urlsafe(32))"'
            )
        if not self.cors_origins:
            raise ConfigurationError("FRONTEND_ORIGINS is empty; the frontend would be blocked.")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Process-wide settings singleton, cached so `.env` is read once."""
    return Settings()
