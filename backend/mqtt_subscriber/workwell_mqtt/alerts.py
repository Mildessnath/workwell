"""Threshold evaluation — mirrors frontend/src/lib/environment.js (evaluateSensor)."""
from __future__ import annotations

DEFAULT_THRESHOLDS = {"max_temp_c": 26.5, "min_light_lux": 300, "max_humidity_pct": 60, "max_noise_dba": 58}

# sensor -> (reading column, threshold column, direction, critical margin, label, unit)
RULES = {
    "temp": ("temperature_c", "max_temp_c", "max", 1.5, "Temperature", "°C"),
    "light": ("light_lux", "min_light_lux", "min", 100, "Ambient light", " lx"),
    "hum": ("humidity_pct", "max_humidity_pct", "max", 8, "Humidity", "%"),
    "sound": ("noise_dba", "max_noise_dba", "max", 8, "Noise", " dBA"),
}
RANK = {"ok": 0, "warning": 1, "critical": 2}


def evaluate(values: dict, thresholds: dict) -> dict[str, dict]:
    """Return {sensor: {level, value, threshold, message}} for sensors present in `values`."""
    out = {}
    for sensor, (col, tcol, direction, margin, label, unit) in RULES.items():
        if values.get(col) is None:
            continue
        v = float(values[col])
        lim = float(thresholds.get(tcol, DEFAULT_THRESHOLDS[tcol]))
        delta = (v - lim) if direction == "max" else (lim - v)
        level = "critical" if delta >= margin else "warning" if delta > 0 else "ok"
        verb = "exceeded" if direction == "max" else "dropped below"
        out[sensor] = {
            "level": level, "value": v, "threshold": lim,
            "message": f"{label} {v:g}{unit} {verb} {lim:g}{unit}",
        }
    return out


class AlertTracker:
    """Emits an alert only when a sensor's level rises; reports recoveries."""

    def __init__(self) -> None:
        self._levels: dict[str, str] = {}

    def update(self, results: dict[str, dict]) -> tuple[list[tuple[str, dict]], list[str]]:
        raised, recovered = [], []
        for sensor, r in results.items():
            prev = self._levels.get(sensor, "ok")
            cur = r["level"]
            if RANK[cur] > RANK[prev]:
                raised.append((sensor, r))
            elif cur == "ok" and prev != "ok":
                recovered.append(sensor)
            self._levels[sensor] = cur
        return raised, recovered
