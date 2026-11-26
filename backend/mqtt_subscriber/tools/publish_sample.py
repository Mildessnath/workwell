"""Publish simulated ESP32 messages to HiveMQ Cloud — tests the pipeline before hardware exists.

usage: python tools/publish_sample.py [--count 20] [--interval 2.5] [--hot]
Uses the same .env as the subscriber (MQTT_* and DEVICE_ID). Use a separate
HiveMQ credential with publish rights in production.
"""
from __future__ import annotations

import argparse
import json
import os
import random
import ssl
import sys
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=20)
    ap.add_argument("--interval", type=float, default=2.5)
    ap.add_argument("--hot", action="store_true", help="send temperatures above the default 26.5°C threshold")
    args = ap.parse_args()
    missing = [k for k in ("MQTT_HOST", "MQTT_USERNAME", "MQTT_PASSWORD") if not os.getenv(k)]
    if missing:
        print("missing env vars:", ", ".join(missing), file=sys.stderr)
        return 1
    dev = os.getenv("DEVICE_ID", "device01")
    base = f"workwell/{dev}"
    c = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2, client_id=f"workwell-sim-{random.randint(1000, 9999)}")
    c.username_pw_set(os.environ["MQTT_USERNAME"], os.environ["MQTT_PASSWORD"])
    c.tls_set_context(ssl.create_default_context())
    c.will_set(f"{base}/status", "offline", qos=1, retain=True)
    c.connect(os.environ["MQTT_HOST"], int(os.getenv("MQTT_PORT", "8883")), keepalive=30)
    c.loop_start()
    c.publish(f"{base}/status", json.dumps({"status": "online", "firmware": "sim-1.0", "rssi": -55}), qos=1, retain=True)
    for i in range(args.count):
        payload = {
            "device_id": dev, "seq": i, "ts": datetime.now(timezone.utc).isoformat(),
            "temperature_c": round(random.uniform(27.2, 28.5) if args.hot else random.uniform(22.8, 24.2), 1),
            "humidity_pct": round(random.uniform(45, 52), 1),
            "light_lux": round(random.uniform(380, 470)),
            "noise_dba": round(random.uniform(38, 46), 1),
        }
        c.publish(f"{base}/environment", json.dumps(payload), qos=1).wait_for_publish(5)
        print("sent", payload)
        time.sleep(args.interval)
    c.publish(f"{base}/status", "offline", qos=1, retain=True).wait_for_publish(5)
    c.loop_stop()
    c.disconnect()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
