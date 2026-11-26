"""Minimal Supabase (PostgREST) client using the service-role key. Server-side only."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

import requests

log = logging.getLogger("workwell.supabase")


class SupabaseError(RuntimeError):
    def __init__(self, msg: str, retryable: bool):
        super().__init__(msg)
        self.retryable = retryable


class SupabaseRest:
    def __init__(self, url: str, service_key: str, timeout: float = 8.0):
        self.base = f"{url}/rest/v1"
        self.timeout = timeout
        self.s = requests.Session()
        self.s.headers.update({
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
        })

    def _req(self, method: str, path: str, *, params=None, json=None, prefer: str | None = None):
        headers = {"Prefer": prefer} if prefer else {}
        try:
            r = self.s.request(method, f"{self.base}/{path}", params=params, json=json, headers=headers, timeout=self.timeout)
        except requests.RequestException as e:
            raise SupabaseError(f"{method} {path}: network error: {e.__class__.__name__}", retryable=True) from e
        if r.status_code >= 500 or r.status_code == 429:
            raise SupabaseError(f"{method} {path}: HTTP {r.status_code} {r.text[:200]}", retryable=True)
        if r.status_code >= 400:
            # 4xx = bad data / schema / auth problem: retrying will not help.
            raise SupabaseError(f"{method} {path}: HTTP {r.status_code} {r.text[:300]}", retryable=False)
        return r.json() if r.content else None

    # --- telemetry -------------------------------------------------------
    def insert_reading(self, row: dict) -> int | None:
        res = self._req("POST", "sensor_readings", params={"on_conflict": "device_id,recorded_at", "select": "id"},
                        json=row, prefer="return=representation,resolution=ignore-duplicates")
        return res[0]["id"] if res else None  # None = duplicate (already stored)

    def touch_device(self, device_id: str, *, status: str | None = None, firmware: str | None = None,
                     seen_at: datetime | None = None, status_changed: bool = False) -> None:
        patch: dict = {}
        if seen_at:
            patch["last_seen_at"] = seen_at.isoformat()
        if status:
            patch["status"] = status
        if status_changed:
            patch["status_changed_at"] = datetime.now(timezone.utc).isoformat()
        if firmware:
            patch["firmware"] = firmware
        if patch:
            self._req("PATCH", "devices", params={"id": f"eq.{device_id}"}, json=patch, prefer="return=minimal")

    def insert_status_event(self, row: dict) -> None:
        self._req("POST", "device_status_events", json=row, prefer="return=minimal")

    def insert_alert(self, row: dict) -> None:
        self._req("POST", "environment_alerts", json=row, prefer="return=minimal")

    def resolve_alerts(self, device_id: str, sensor: str) -> None:
        self._req("PATCH", "environment_alerts",
                  params={"device_id": f"eq.{device_id}", "sensor": f"eq.{sensor}", "resolved_at": "is.null"},
                  json={"resolved_at": datetime.now(timezone.utc).isoformat()}, prefer="return=minimal")

    # --- config ----------------------------------------------------------
    def get_device(self, device_id: str) -> dict | None:
        res = self._req("GET", "devices", params={"id": f"eq.{device_id}", "select": "id,status"})
        return res[0] if res else None

    def get_thresholds(self, device_id: str) -> dict | None:
        res = self._req("GET", "environment_thresholds", params={
            "device_id": f"eq.{device_id}", "select": "max_temp_c,min_light_lux,max_humidity_pct,max_noise_dba"})
        return res[0] if res else None
