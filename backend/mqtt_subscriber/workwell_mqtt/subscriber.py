"""WorkWell subscriber: HiveMQ Cloud (TLS) -> validation -> Supabase.

Run:  python -m workwell_mqtt
"""
from __future__ import annotations

import logging
import signal
import ssl
import threading
import time
from collections import deque
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from .alerts import DEFAULT_THRESHOLDS, AlertTracker, evaluate
from .config import Config, ConfigError, load_config
from .payloads import PayloadError, parse_alert, parse_environment, parse_status
from .supabase_rest import SupabaseError, SupabaseRest

log = logging.getLogger("workwell.subscriber")

RETRY_QUEUE_MAX = 1000
FLUSH_EVERY_S = 10


class Subscriber:
    def __init__(self, cfg: Config, db: SupabaseRest):
        self.cfg = cfg
        self.db = db
        self.tracker = AlertTracker()
        self.thresholds = dict(DEFAULT_THRESHOLDS)
        self._thresholds_at = 0.0
        self.last_env_at: float | None = None
        self.device_status = "unknown"
        self.retry: deque = deque(maxlen=RETRY_QUEUE_MAX)  # (description, callable)
        self.stop = threading.Event()
        self.lock = threading.Lock()

        self.client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
            client_id=cfg.mqtt_client_id,
            protocol=mqtt.MQTTv311,
            clean_session=False,  # broker queues QoS1 messages while we reconnect
        )
        self.client.username_pw_set(cfg.mqtt_username, cfg.mqtt_password)
        ctx = ssl.create_default_context()           # verifies HiveMQ's public certificate
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        self.client.tls_set_context(ctx)
        self.client.reconnect_delay_set(min_delay=1, max_delay=60)
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message

    # ------------------------------------------------------------ helpers
    def _db(self, desc: str, fn, *, queue_on_fail: bool = True):
        try:
            return fn()
        except SupabaseError as e:
            if e.retryable and queue_on_fail:
                if len(self.retry) == self.retry.maxlen:
                    log.error("retry queue full; dropping oldest pending write")
                self.retry.append((desc, fn))
                log.warning("supabase write queued for retry (%s): %s", desc, e)
            elif e.retryable:
                log.warning("supabase write skipped (%s): %s", desc, e)
            else:
                log.error("supabase write failed permanently (%s): %s", desc, e)
            return None

    def _refresh_thresholds(self, force: bool = False):
        if not force and time.monotonic() - self._thresholds_at < self.cfg.threshold_refresh_s:
            return
        self._thresholds_at = time.monotonic()
        try:
            t = self.db.get_thresholds(self.cfg.device_id)
            if t:
                self.thresholds = {k: float(v) for k, v in t.items()}
        except SupabaseError as e:
            log.warning("could not refresh thresholds, using last known: %s", e)

    def _set_status(self, status: str, reason: str, **extra):
        now = datetime.now(timezone.utc)
        changed = status != self.device_status
        self.device_status = status
        dev = self.cfg.device_id
        self._db("device status", lambda: self.db.touch_device(
            dev, status=status, firmware=extra.get("firmware"), seen_at=now if status == "online" else None,
            status_changed=changed))
        if changed:
            log.info("device %s is now %s (%s)", dev, status, reason)
            row = {"device_id": dev, "status": status, "reason": reason,
                   "reported_at": extra.get("reported_at", now).isoformat()}
            for k in ("rssi", "ip_address", "uptime_s", "firmware"):
                if extra.get(k) is not None:
                    row[k] = extra[k]
            self._db("status event", lambda: self.db.insert_status_event(row))

    # ---------------------------------------------------------- callbacks
    def on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            log.error("MQTT connect refused: %s (check MQTT_USERNAME / MQTT_PASSWORD)", reason_code)
            return
        topics = self.cfg.topics
        client.subscribe([(topics["environment"], 1), (topics["status"], 1), (topics["alerts"], 1)])
        log.info("connected to %s:%s, subscribed to %s", self.cfg.mqtt_host, self.cfg.mqtt_port, ", ".join(topics.values()))

    def on_disconnect(self, client, userdata, flags, reason_code, properties):
        if self.stop.is_set():
            return
        log.warning("MQTT disconnected (%s); paho will reconnect with backoff (1-60 s)", reason_code)

    def on_message(self, client, userdata, msg):
        topics = self.cfg.topics
        try:
            with self.lock:
                if msg.topic == topics["environment"]:
                    self.handle_environment(msg.payload)
                elif msg.topic == topics["status"]:
                    self.handle_status(msg.payload)
                elif msg.topic == topics["alerts"]:
                    self.handle_alert(msg.payload)
        except PayloadError as e:
            log.warning("rejected payload on %s: %s | %r", msg.topic, e, msg.payload[:200])
        except Exception:  # never let one bad message kill the loop
            log.exception("unexpected error handling %s", msg.topic)

    # ----------------------------------------------------------- handlers
    def handle_environment(self, payload: bytes):
        reading = parse_environment(payload, self.cfg.device_id)
        if reading.clock_note:
            log.debug("timestamp replaced with receive time: %s", reading.clock_note)
        self.last_env_at = time.monotonic()
        if self.device_status != "online":
            self._set_status("online", "environment data received")
        else:
            self._db("last_seen", lambda: self.db.touch_device(self.cfg.device_id, seen_at=datetime.now(timezone.utc)),
                     queue_on_fail=False)
        row = reading.to_row()
        reading_id = self._db("reading", lambda: self.db.insert_reading(row))
        log.debug("stored reading %s: %s", reading_id, reading.values)

        self._refresh_thresholds()
        raised, recovered = self.tracker.update(evaluate(reading.values, self.thresholds))
        for sensor, r in raised:
            alert = {"device_id": self.cfg.device_id, "sensor": sensor, "level": r["level"], "value": r["value"],
                     "threshold": r["threshold"], "message": r["message"], "source": "subscriber"}
            if reading_id:
                alert["reading_id"] = reading_id
            log.info("alert raised: %s", r["message"])
            self._db("alert", lambda a=alert: self.db.insert_alert(a))
        for sensor in recovered:
            log.info("alert resolved: %s back within threshold", sensor)
            self._db("resolve", lambda s=sensor: self.db.resolve_alerts(self.cfg.device_id, s))

    def handle_status(self, payload: bytes):
        st = parse_status(payload, self.cfg.device_id)
        self._set_status(st.status, st.reason or "status topic", reported_at=st.reported_at, rssi=st.rssi,
                         ip_address=st.ip_address, uptime_s=st.uptime_s, firmware=st.firmware)
        if st.status == "online":
            self.last_env_at = time.monotonic()  # give the device a full stale window

    def handle_alert(self, payload: bytes):
        a = parse_alert(payload, self.cfg.device_id)
        row = {"device_id": a.device_id, "sensor": a.sensor, "level": a.level, "message": a.message,
               "value": a.value, "threshold": a.threshold, "source": "device"}
        log.info("device alert: %s", a.message)
        self._db("device alert", lambda: self.db.insert_alert(row))

    # -------------------------------------------------------- maintenance
    def maintenance_loop(self):
        while not self.stop.wait(FLUSH_EVERY_S):
            with self.lock:
                # 1) watchdog: no data for STALE_AFTER_SECONDS -> offline
                if (self.device_status == "online" and self.last_env_at is not None
                        and time.monotonic() - self.last_env_at > self.cfg.stale_after_s):
                    self._set_status("offline", f"no data for {self.cfg.stale_after_s}s (watchdog)")
                # 2) flush queued writes
                pending = len(self.retry)
                for _ in range(pending):
                    desc, fn = self.retry.popleft()
                    try:
                        fn()
                    except SupabaseError as e:
                        if e.retryable:
                            self.retry.appendleft((desc, fn))
                            log.warning("retry still failing (%s), %d pending", desc, len(self.retry))
                            break
                        log.error("dropping write (%s): %s", desc, e)
                if pending and not self.retry:
                    log.info("flushed %d queued write(s)", pending)

    def run(self) -> int:
        try:
            dev = self.db.get_device(self.cfg.device_id)
        except SupabaseError as e:
            log.error("cannot reach Supabase: %s", e)
            return 2
        if not dev:
            log.error("device %r not found in public.devices — run supabase/seed.sql first", self.cfg.device_id)
            return 2
        self.device_status = dev.get("status") or "unknown"
        self._refresh_thresholds(force=True)
        threading.Thread(target=self.maintenance_loop, name="maintenance", daemon=True).start()
        self.client.connect_async(self.cfg.mqtt_host, self.cfg.mqtt_port, keepalive=30)
        self.client.loop_start()
        try:
            while not self.stop.wait(1):
                pass
        finally:
            self.client.disconnect()
            self.client.loop_stop()
            log.info("subscriber stopped (%d write(s) still queued)", len(self.retry))
        return 0


def main() -> int:
    try:
        cfg = load_config()
    except ConfigError as e:
        logging.basicConfig(level="INFO", format="%(levelname)s %(message)s")
        logging.getLogger("workwell").error("%s", e)
        return 1
    logging.basicConfig(level=cfg.log_level, format="%(asctime)s %(levelname)-7s %(name)s: %(message)s")
    sub = Subscriber(cfg, SupabaseRest(cfg.supabase_url, cfg.supabase_service_key))
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: sub.stop.set())
    return sub.run()
