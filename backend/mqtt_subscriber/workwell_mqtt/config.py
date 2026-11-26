"""Environment configuration. All secrets come from env vars / .env only."""
from __future__ import annotations

import os
import re
from dataclasses import dataclass

try:  # optional: load .env next to the package when python-dotenv is installed
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:  # pragma: no cover
    pass

REQUIRED = ("MQTT_HOST", "MQTT_USERNAME", "MQTT_PASSWORD", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")


class ConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class Config:
    mqtt_host: str
    mqtt_port: int
    mqtt_username: str
    mqtt_password: str
    mqtt_client_id: str
    supabase_url: str
    supabase_service_key: str
    device_id: str
    stale_after_s: int
    threshold_refresh_s: int
    log_level: str

    @property
    def topics(self) -> dict[str, str]:
        base = f"workwell/{self.device_id}"
        return {"environment": f"{base}/environment", "status": f"{base}/status", "alerts": f"{base}/alerts"}


def load_config() -> Config:
    missing = [k for k in REQUIRED if not os.getenv(k, "").strip()]
    if missing:
        raise ConfigError(
            "Missing required environment variables: " + ", ".join(missing)
            + ". Copy .env.example to .env and fill them in."
        )
    device_id = os.getenv("DEVICE_ID", "device01").strip()
    if not re.fullmatch(r"[a-z0-9_-]{1,64}", device_id):
        raise ConfigError(f"DEVICE_ID must match [a-z0-9_-]{{1,64}}, got {device_id!r}")
    url = os.environ["SUPABASE_URL"].strip().rstrip("/")
    if not url.startswith("https://"):
        raise ConfigError("SUPABASE_URL must start with https://")
    port = int(os.getenv("MQTT_PORT", "8883"))
    if port != 8883:
        raise ConfigError("MQTT_PORT must be 8883 (TLS). Plain-text MQTT is not allowed.")
    return Config(
        mqtt_host=os.environ["MQTT_HOST"].strip(),
        mqtt_port=port,
        mqtt_username=os.environ["MQTT_USERNAME"].strip(),
        mqtt_password=os.environ["MQTT_PASSWORD"],
        mqtt_client_id=os.getenv("MQTT_CLIENT_ID", f"workwell-subscriber-{device_id}").strip(),
        supabase_url=url,
        supabase_service_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"].strip(),
        device_id=device_id,
        stale_after_s=max(5, int(os.getenv("STALE_AFTER_SECONDS", "30"))),
        threshold_refresh_s=max(10, int(os.getenv("THRESHOLD_REFRESH_SECONDS", "60"))),
        log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
    )
