"""Payload validation for the three WorkWell topics. Pure Python, no I/O."""
from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

MAX_PAYLOAD_BYTES = 4096
MAX_FUTURE_SKEW = timedelta(minutes=5)
MAX_PAST_AGE = timedelta(days=7)

# canonical column -> (accepted keys, min, max)
ENV_FIELDS = {
    "temperature_c": (("temperature_c", "temperature", "temp"), -40.0, 85.0),
    "humidity_pct": (("humidity_pct", "humidity", "hum"), 0.0, 100.0),
    "light_lux": (("light_lux", "light", "lux"), 0.0, 120000.0),
    "noise_dba": (("noise_dba", "noise", "sound", "dba"), 0.0, 140.0),
}
SENSOR_ALIASES = {
    "temp": "temp", "temperature": "temp", "temperature_c": "temp",
    "hum": "hum", "humidity": "hum", "humidity_pct": "hum",
    "light": "light", "lux": "light", "light_lux": "light",
    "sound": "sound", "noise": "sound", "noise_dba": "sound",
}


class PayloadError(ValueError):
    pass


@dataclass
class EnvironmentReading:
    device_id: str
    recorded_at: datetime
    values: dict[str, float]
    seq: int | None = None
    clock_note: str | None = None  # set when the device timestamp was replaced

    def to_row(self) -> dict:
        row = {"device_id": self.device_id, "recorded_at": self.recorded_at.isoformat(), **self.values}
        if self.seq is not None:
            row["seq"] = self.seq
        return row


@dataclass
class StatusUpdate:
    device_id: str
    status: str  # online | offline
    reported_at: datetime
    rssi: int | None = None
    ip_address: str | None = None
    uptime_s: int | None = None
    firmware: str | None = None
    reason: str | None = None


@dataclass
class DeviceAlert:
    device_id: str
    sensor: str
    level: str
    message: str
    value: float | None = None
    threshold: float | None = None
    extra: dict = field(default_factory=dict)


def _decode(raw: bytes) -> object:
    if len(raw) > MAX_PAYLOAD_BYTES:
        raise PayloadError(f"payload too large ({len(raw)} bytes)")
    try:
        text = raw.decode("utf-8").strip()
    except UnicodeDecodeError as e:
        raise PayloadError("payload is not UTF-8") from e
    if not text:
        raise PayloadError("empty payload")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return text  # bare strings are allowed for status ("online"/"offline")


def _number(v: object, name: str) -> float:
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        raise PayloadError(f"{name} must be a number")
    f = float(v)
    if math.isnan(f) or math.isinf(f):
        raise PayloadError(f"{name} must be finite")
    return f


def parse_timestamp(v: object, now: datetime) -> tuple[datetime, str | None]:
    """Accept ISO-8601 or epoch seconds/ms. Fall back to `now` if missing or implausible."""
    if v is None:
        return now, "no device timestamp"
    try:
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            secs = v / 1000.0 if v > 1e11 else float(v)
            ts = datetime.fromtimestamp(secs, tz=timezone.utc)
        elif isinstance(v, str):
            ts = datetime.fromisoformat(v.replace("Z", "+00:00"))
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
        else:
            return now, "unsupported timestamp type"
    except (ValueError, OverflowError, OSError):
        return now, "unparseable device timestamp"
    if ts > now + MAX_FUTURE_SKEW:
        return now, "device clock ahead"
    if ts < now - MAX_PAST_AGE:
        return now, "device clock behind (NTP not synced?)"
    return ts.astimezone(timezone.utc), None


def _check_device(obj: dict, expected: str) -> None:
    dev = obj.get("device_id")
    if dev is not None and dev != expected:
        raise PayloadError(f"device_id {dev!r} does not match topic device {expected!r}")


def parse_environment(raw: bytes, device_id: str, now: datetime | None = None) -> EnvironmentReading:
    now = now or datetime.now(timezone.utc)
    obj = _decode(raw)
    if not isinstance(obj, dict):
        raise PayloadError("environment payload must be a JSON object")
    _check_device(obj, device_id)
    values: dict[str, float] = {}
    for col, (keys, lo, hi) in ENV_FIELDS.items():
        key = next((k for k in keys if k in obj and obj[k] is not None), None)
        if key is None:
            continue
        f = _number(obj[key], key)
        if not lo <= f <= hi:
            raise PayloadError(f"{key}={f} outside sensor range [{lo}, {hi}]")
        values[col] = round(f, 2)
    if not values:
        raise PayloadError("no sensor values in environment payload")
    seq = obj.get("seq")
    if seq is not None and (isinstance(seq, bool) or not isinstance(seq, int) or seq < 0):
        raise PayloadError("seq must be a non-negative integer")
    ts, note = parse_timestamp(obj.get("ts", obj.get("timestamp")), now)
    return EnvironmentReading(device_id=device_id, recorded_at=ts, values=values, seq=seq, clock_note=note)


def parse_status(raw: bytes, device_id: str, now: datetime | None = None) -> StatusUpdate:
    now = now or datetime.now(timezone.utc)
    obj = _decode(raw)
    if isinstance(obj, str):
        obj = {"status": obj}
    if not isinstance(obj, dict):
        raise PayloadError("status payload must be a JSON object or a string")
    _check_device(obj, device_id)
    status = str(obj.get("status", "")).strip().lower()
    if status not in ("online", "offline"):
        raise PayloadError("status must be 'online' or 'offline'")
    rssi = obj.get("rssi")
    if rssi is not None:
        rssi = int(_number(rssi, "rssi"))
        if not -120 <= rssi <= 0:
            rssi = None
    uptime = obj.get("uptime_s")
    if uptime is not None:
        uptime = int(_number(uptime, "uptime_s"))
        if uptime < 0:
            raise PayloadError("uptime_s must be >= 0")
    ip = obj.get("ip")
    ip = str(ip)[:45] if ip else None
    fw = obj.get("firmware")
    fw = str(fw)[:40] if fw else None
    reason = obj.get("reason")
    reason = str(reason)[:120] if reason else None
    ts, _ = parse_timestamp(obj.get("ts"), now)
    return StatusUpdate(device_id, status, ts, rssi, ip, uptime, fw, reason)


def parse_alert(raw: bytes, device_id: str) -> DeviceAlert:
    obj = _decode(raw)
    if not isinstance(obj, dict):
        raise PayloadError("alert payload must be a JSON object")
    _check_device(obj, device_id)
    sensor = SENSOR_ALIASES.get(str(obj.get("sensor", "")).strip().lower())
    if not sensor:
        raise PayloadError("sensor must be one of temp, hum, light, sound")
    level = str(obj.get("level", "")).strip().lower()
    if level not in ("warning", "critical"):
        raise PayloadError("level must be 'warning' or 'critical'")
    value = _number(obj["value"], "value") if obj.get("value") is not None else None
    threshold = _number(obj["threshold"], "threshold") if obj.get("threshold") is not None else None
    message = str(obj.get("message") or f"{sensor} {level} reported by device").strip()[:500]
    return DeviceAlert(device_id, sensor, level, message, value, threshold)
