from __future__ import annotations

from pathlib import Path
import dotenv
from dynaconf import Dynaconf

BASE_DIR = Path(__file__).resolve().parent

# Load .env explicitly from the project root (parent of config directory)
dotenv.load_dotenv(dotenv_path=BASE_DIR.parent / ".env")

settings = Dynaconf(
    envvar_prefix="PAKSENTIMENT_GATEWAY",
    settings_files=[
        str(BASE_DIR / "settings.toml"),
        str(BASE_DIR / "settings.dev.toml"),
        str(BASE_DIR / "settings.prod.toml"),
        str(BASE_DIR / ".secrets.toml"),
    ],
    environments=True,
    load_dotenv=True,
)

__all__ = ["settings"]

