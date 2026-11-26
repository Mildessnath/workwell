# WorkWell Frontend (Radial Orbit)

Vite + React + Tailwind implementation of the five approved Stitch screens.

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # production build in dist/
```

| Route | Page |
|---|---|
| `/` | Home Orbit (Bold Universe) |
| `/live` | Live Stream |
| `/playtime` | Peekaboo Playtime |
| `/history` | History / Comfort Story |
| `/settings` | Orbit Tuning & Device |

Desktop layout at ≥1280px (`xl`), with sidebar. Below that, the mobile layout with bottom nav.

## Data: DEMO and REAL
One data service (`src/lib/sensorSource.jsx`) feeds all five pages. Switch modes in the sidebar or in Settings.

- **DEMO** (default): simulated stream, labeled DEMO. The scenario switch drives every state.
- **REAL**: Supabase readings written by the MQTT subscriber (Realtime plus 10 s polling); History uses the `reading_buckets` RPC.
  Needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (see `.env.example`). Disabled until both are set.
  The anon key only. Never the service-role key.

Thresholds, toggles and Peekaboo progress persist in `localStorage`. Setup: `../docs/BACKEND_SETUP.md`.

## Assets
Single source of truth: `src/assets/assetMap.js`. See `../docs/ASSET_MAPPING.md`.
