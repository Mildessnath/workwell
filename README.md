# WorkWell — Radial Universe

An IoT workspace-comfort monitor with a companion character, **Peekaboo**.
An ESP32 measures temperature, humidity, ambient light and noise. The web app shows them as a playful radial "orbit" and Peekaboo reacts to your environment.

> All sensor readings in the app are currently **DEMO (simulated)** and labeled as such.

## Quick start

Requirements: Node.js 18+ (tested on 22).

```bash
cd frontend
npm install
npm run dev          # open http://127.0.0.1:5173
```

Production build: `npm run build` (output in `frontend/dist/`), preview with `npm run preview`.

## Pages
| Route | Page | What you can do |
|---|---|---|
| `/` | Home Orbit | Comfort score, 4 sensor satellites, inspector, Peekaboo's tip; simulate states |
| `/live` | Live Stream | Live waveform vs. your threshold, Sample, Blink LED, state simulation |
| `/history` | History | Daily / Weekly / Monthly comfort rings and flow curve |
| `/playtime` | Peekaboo Playtime | Pet, feed, Starlight Tap mini-game, habitat decorations, progression |
| `/settings` | Settings | Comfort thresholds, LED preferences, data source (Demo / Real) |

Desktop layout from 1280px wide; below that, the mobile layout with bottom navigation.

## Project structure
```
frontend/        React 18 + Vite 5 + Tailwind 3 app
backend/         Python MQTT -> Supabase subscriber (scaffolded, not yet connected)
supabase/        SQL schema migration + seed (scaffolded, not yet applied)
docs/            ASSET_MAPPING, UI_UX_AUDIT, BACKEND_SETUP
stitch_workwell_iot_environment_monitor/   original Stitch designs and Peekaboo source art (reference)
```

## Documentation
- [docs/UI_UX_AUDIT.md](docs/UI_UX_AUDIT.md) — final UI/UX review and test results
- [docs/ASSET_MAPPING.md](docs/ASSET_MAPPING.md) — Peekaboo expressions, state mapping, missing assets
- [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md) — Supabase, HiveMQ, ESP32 setup (next phase)

## Security
Secrets never go in the repo. `.env*` files (except `.env.example` placeholders) and `secrets.h` are git-ignored.
The frontend only ever uses the public Supabase anon key. The service-role key belongs to the backend subscriber only.
