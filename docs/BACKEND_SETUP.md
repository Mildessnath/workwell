# WorkWell — Backend & IoT Setup

```
ESP32 ──MQTT/TLS:8883──▶ HiveMQ Cloud ──▶ Python subscriber ──HTTPS (service role)──▶ Supabase Postgres
                                                                                         │ RLS + Realtime
                                                                    React frontend ◀─────┘ (anon key)
```

| Part | Location |
|---|---|
| SQL schema, RLS, history RPC, Realtime | `supabase/migrations/20261127000000_workwell_init.sql` |
| Seed (device01 + default thresholds) | `supabase/seed.sql` |
| MQTT subscriber | `backend/mqtt_subscriber/` (`python -m workwell_mqtt`) |
| Pipeline test publisher (no hardware) | `backend/mqtt_subscriber/tools/publish_sample.py` |
| Frontend data service | `frontend/src/lib/sensorSource.jsx`, `realSource.js`, `history.js`, `dataMode.js` |

**Current status: no credentials are configured. Nothing has been connected to a real Supabase project or HiveMQ cluster.** The app runs in DEMO mode until you complete the steps below.

---

## 1. Credentials you need to provide

| # | Credential | Where to get it | Goes in |
|---|---|---|---|
| 1 | Supabase **Project URL** | Supabase → Project Settings → API | `frontend/.env.local` (`VITE_SUPABASE_URL`) and `backend/mqtt_subscriber/.env` (`SUPABASE_URL`) |
| 2 | Supabase **anon (public) key** | same page | `frontend/.env.local` (`VITE_SUPABASE_ANON_KEY`) |
| 3 | Supabase **service_role key** (secret) | same page | `backend/mqtt_subscriber/.env` **only** (`SUPABASE_SERVICE_ROLE_KEY`) |
| 4 | HiveMQ Cloud **cluster host** | HiveMQ Console → your cluster → Overview | subscriber `.env` (`MQTT_HOST`) and ESP32 firmware |
| 5 | HiveMQ credential for the **subscriber** (subscribe `workwell/#`) | HiveMQ → Access Management → Credentials | subscriber `.env` (`MQTT_USERNAME`, `MQTT_PASSWORD`) |
| 6 | HiveMQ credential for the **ESP32** (publish `workwell/device01/#`) | same | ESP32 firmware (never in the repo) |
| 7 | Wi-Fi SSID / password | your network | ESP32 firmware |

Use separate HiveMQ credentials for the ESP32 and the subscriber, so a leaked device credential cannot read everything.

## 2. Supabase

1. Create a project. Supabase runs Postgres 15+, which the migration needs for `date_bin`.
2. In the SQL Editor, run `supabase/migrations/20261127000000_workwell_init.sql`, then `supabase/seed.sql`.
   With the CLI instead: `supabase link` → `supabase db push` → run the seed.
3. Database → Replication: confirm `sensor_readings`, `devices` and `environment_alerts` are in `supabase_realtime`. The migration adds them; without Realtime the frontend falls back to polling every 10 s.
4. **Security notes**
   - Telemetry tables have no insert/update policies for `anon` or `authenticated`. Only the subscriber's service-role key can write them.
   - `seed.sql` sets `devices.is_public = true` so the frontend can **read** device01 with the anon key, because there is no sign-in UI yet. For production, set `is_public = false`, set `owner_id` to your `auth.users.id`, and add sign-in.
   - Threshold edits from Settings are saved locally. They sync to Supabase only for the signed-in device owner. Without sign-in, Settings shows "Saved locally · cloud sync needs owner sign-in". To change the thresholds the subscriber uses before auth exists, edit `environment_thresholds` in the Supabase table editor.
   - Peekaboo tables (`peekaboo_profiles`, `_interactions`, `_inventory`) are per-user and need sign-in. The Playtime page still uses local storage and was not changed.

## 3. MQTT subscriber

```bash
cd backend/mqtt_subscriber
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # then fill in credentials 3, 4, 5
python -m unittest discover -s tests -t .   # 11 tests, no network needed
python -m workwell_mqtt
```

What it does:
- TLS only. Port 8883 is enforced, the certificate is verified against system CAs, minimum TLS 1.2.
- Subscribes at QoS 1 with a persistent session, and reconnects automatically with 1–60 s backoff.
- Validates every payload: JSON, value types, sensor ranges, device_id must match the topic, 4 KB size limit. Invalid messages are logged and skipped.
- Timestamps: uses the device `ts` (ISO-8601 or epoch s/ms). Falls back to receive time if it's missing, more than 5 min in the future, or more than 7 days old (e.g. NTP not yet synced).
- Readings are idempotent (`unique (device_id, recorded_at)`), so retries never duplicate.
- Supabase outages: failed writes are queued in memory (up to 1000) and retried every 10 s, in order.
- Evaluates thresholds (same rules as the frontend). Inserts an alert only when a sensor escalates (ok→warning→critical), and resolves it on recovery.
- Watchdog: no environment message for `STALE_AFTER_SECONDS` (default 30) marks the device offline.

Test the pipeline before the hardware exists:
```bash
python tools/publish_sample.py --count 20          # normal readings
python tools/publish_sample.py --count 10 --hot    # above 26.5 °C -> alerts
```

## 4. Frontend

```bash
cd frontend
copy .env.example .env.local      # fill in credentials 1 and 2 (anon key ONLY)
npm run dev
```
Switch **Demo / Real** in the sidebar (desktop) or Settings (both layouts). REAL stays disabled until both `VITE_` variables are set. DEMO mode is unchanged.

In REAL mode:
- Home and Live use the latest 8 readings, via Realtime with polling as a fallback.
- Offline = device `status = offline` (LWT or watchdog), or no reading for max(30 s, 4 × sample interval).
- No Data = device known but no readings yet.
- History uses the `reading_buckets` RPC: 3-hour buckets for daily, 1-day for weekly, 7-day for monthly.

## 5. MQTT payload contract (ESP32 firmware)

**`workwell/device01/environment`** — QoS 1, not retained, every 2.5 s
```json
{"device_id":"device01","ts":"2026-11-27T10:00:00Z","seq":123,
 "temperature_c":23.4,"humidity_pct":48.0,"light_lux":435,"noise_dba":42.1}
```
`ts` can be epoch seconds or milliseconds. A sensor that failed to read can be omitted or sent as `null`. Short keys `temp`/`hum`/`lux`/`sound` are also accepted.

**`workwell/device01/status`** — QoS 1, **retained**
```json
{"status":"online","firmware":"v2.4.1","rssi":-61,"ip":"192.168.1.20","uptime_s":120}
```
Set the MQTT **Last Will** to topic `workwell/device01/status`, payload `offline`, QoS 1, retained.

**`workwell/device01/alerts`** — optional, QoS 1
```json
{"sensor":"temp","level":"warning","value":27.1,"threshold":26.5,"message":"Too warm"}
```

## 6. ESP32 hardware connection checklist

- [ ] Wiring: DHT22 data → **GPIO4** (10 kΩ pull-up to 3.3 V); BH1750 → I2C SDA/SCL (ADDR to GND = 0x23); MAX4466 OUT → an **ADC1** pin (e.g. GPIO34/36; ADC2 is unusable while Wi-Fi is on); all at 3.3 V with shared GND.
- [ ] Each sensor tested on its own over Serial before adding networking.
- [ ] MAX4466 calibrated: convert peak-to-peak samples to an approximate dBA using a reference phone sound meter, and record the offset.
- [ ] Wi-Fi connects; **NTP sync** (`configTime(0, 0, "pool.ntp.org")`) completes before the first publish.
- [ ] TLS: `WiFiClientSecure` with the root CA (ISRG Root X1 for HiveMQ Cloud) via `setCACert()`. Do not use `setInsecure()`.
- [ ] Port **8883**, ESP32's own HiveMQ credential, and a unique client ID (e.g. `workwell-device01`).
- [ ] Last Will configured (see §5). `online` status published **retained** right after connecting.
- [ ] Environment JSON published every 2.5 s to `workwell/device01/environment` (PubSubClient: raise `setBufferSize(512)`).
- [ ] Reconnect loop for both Wi-Fi and MQTT, with backoff. No `delay()` blocking longer than the keep-alive.
- [ ] Credentials in a git-ignored `secrets.h`, never in the sketch.
- [ ] Subscriber running and logging `stored reading` / no `rejected payload` warnings (use `LOG_LEVEL=DEBUG`).
- [ ] Supabase table editor shows new rows in `sensor_readings` and `devices.status = online`.
- [ ] Frontend in REAL mode: the live chip shows the latest reading time; unplugging the ESP32 shows **Offline** within about 30 s.
- [ ] Optional: RGB LED driven by the ESP32's own threshold check, publishing to `/alerts`.
