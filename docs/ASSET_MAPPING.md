# WorkWell — Asset Mapping

Inventory and mapping of WorkWell's visual assets for frontend implementation.
Code-side source of truth: [`frontend/src/assets/assetMap.js`](../frontend/src/assets/assetMap.js).

## 1. Sources inspected

| Source | Location |
|---|---|
| Supplied original assets (6 files) | `stitch_workwell_iot_environment_monitor/stitch_workwell_iot_environment_monitor/Detail Asets/` |
| Mapping guide | `…/workwell_visual_asset_character_mapping_guide/code.html` |
| Stitch screens (10) | `…/radial_orbit_{bold_universe,live_monitoring,history_analytics,peekaboo_playtime,settings}_{desktop,mobile}/code.html` |

> The asset folder is named **`Detail Asets`**, not `detailed_assets`. It holds only six PNGs: no subfolders, icons, animations or other files.

Method:
1. Opened and viewed every image. Its expression was identified from the artwork, not from the filename.
2. Pulled every `<img>`, CSS `url()`, `uploads/` reference and runtime `.src =` assignment out of all 11 HTML files.
3. Grouped the remote Stitch image URLs by identity and labeled each one using the guide's captions.
4. Confirmed byte identity. The Stitch upload names carry a 6-hex suffix (for example `a7c9af00-…-59a4f7.png`), and that suffix equals the first 6 hex digits of the local file's SHA-256 in all six cases. The supplied files are exactly the ones the Stitch designs used.

## 2. Local asset directory

```
frontend/public/assets/peekaboo/   ← byte-identical copies (SHA-256 verified), original filenames kept
frontend/src/assets/assetMap.js    ← centralized mapping (expressions, events, sensors, sizes)
```

The originals in `Detail Asets/` were not modified. Files are served from `/assets/peekaboo/<file>.png`.

## 3. Peekaboo character assets

All six: **1080 × 1080 px PNG, 1:1, RGBA with an opaque white background** (not a transparent cutout). Each figure has a soft colored glow.

| Expression | Color | File | What the art shows | SHA-256 prefix |
|---|---|---|---|---|
| **Happy** | Yellow | `a7c9af00-3c36-41bb-a7dc-c158ac9a9837.png` | Lying down, chin on paws, closed contented eyes, small smile | `59a4f7` |
| **Celebrate** | Red | `c6130dfb-3f11-4ab7-aa1f-a4ebeeddc463.png` | Sitting, polka-dot party hat, squeezed eyes, open-mouth cheer | `0ab66b` |
| **Sleepy** | Purple | `79ed381d-52f4-40b9-a45b-8b6831f801b5.png` | Flopped forward, eyes closed, asleep | `6c99de` |
| **Curious** | Green | `d8681424-c7b9-4070-94d5-6ea55b7b0d30.png` | Sitting, "3"-shaped pucker, one paw raised (playful wave) | `d4ef4a` |
| **Encourage** | Orange | `65ea6de9-2ee9-47ac-bfd5-0a02930ff8c7.png` | Side profile, turned away, squinting ">" eye, red mouth | `61db22` |
| **Neutral** | Blank (white) | `89fee179-c336-41f1-a9e0-8c8814fcaa37.png` | Standing, uncolored body, gentle closed eyes, blush marks | `aac8b5` |

All files are in `frontend/public/assets/peekaboo/`.

### Rendering rules (guide §4)
- Wrap in a white circular frame: `rounded-full bg-white p-1`, image `object-contain`.
- Never use `object-cover`. Never crop, stretch, recolor or filter.
- Because the PNG background is opaque white, always place the image on a white frame. On a tinted surface it shows as a white square unless masked by the circle.
- The source is about 8× the largest display size (128 px), so the same file is sharp at every size. Pass `width`/`height` attributes to avoid layout shift.

### State → expression mapping (final, approved 2026-11-27)

Readings are always evaluated against the **configured thresholds** (Settings), never by sensor type alone.

| State | Trigger | Expression | UI treatment |
|---|---|---|---|
| `normal` | All readings comfortable | Happy | Mint halo, "All Clear" |
| `change` | A reading drifts close to a max limit with no violation (temp ≤ 1 °C, humidity ≤ 5 %, noise ≤ 5 dBA from the limit) | Curious | Sky halo, "Shift" |
| `relax` | Light at or above the min but within 60 lx of it (dim, acceptable) | Sleepy | Lilac halo, "Calm" |
| `warning` | A threshold is violated | Encourage | Amber banner, amber satellite ring |
| `critical` | Violated by a wide margin (temp +1.5 °C, humidity +8 %, noise +8 dBA, light −100 lx) | Encourage **+ critical indicator** | Pulsing coral halo, coral banner, "Alert" pill, coral LED |
| `offline` | Device connectivity lost | Neutral | Muted orbit, "ESP32 Offline" banner |
| `nodata` | Connected, no sample yet | Neutral | `—` values |
| achievement | Starlight Tap round, snack reward, History peak insight | Celebrate | — |

Priority: offline > nodata > critical > warning > change > relax > normal. Implemented in `frontend/src/lib/environment.js`.

The **tip bubble** ("Peekaboo's Note") follows the current state, both expression and text. It never shows warning text while conditions are normal.

In code: `peekabooFor('warning')` → Encourage, and so on.

## 4. Usage by page and component

Sizes were measured from the Stitch Tailwind classes. All are square (1:1).

| Page | Component | Asset | Desktop | Mobile |
|---|---|---|---|---|
| All desktop pages | Sidebar brand logo (electric ring) | Happy | 40 px | — |
| Bold Universe (Home) | Orbit core (changes with mood) | Happy by default, varies by state | 112 px | 80 px |
| Bold Universe | "Peekaboo's Note" tip pill | Follows current state | 48 px | 40 px |
| Live Monitoring | Orbit core (changes with state) | Happy / Encourage / Neutral | 96 px | 72 px |
| Live Monitoring | Live note pill | Follows current state | 48 px | 40 px |
| History Analytics | Comfort score core | Happy | 64 px | — |
| History Analytics | Peak insight avatar | Celebrate | 40 px | 40 px |
| Peekaboo Playtime | Companion core (changes with interaction) | Happy by default on both layouts | 128 px | 80 px |
| Settings | "Comfort Band Sync" banner | Happy (informational, not a warning) | 56 px | 48 px |
| Settings | Gear illustration | **MISSING**: placeholder glyph (M2) | 48 px | 36 px |
| All dashboards | Sensor satellites and cards | **MISSING**: placeholder glyphs (M1) | 36–44 px | 24–28 px |

Guide §4 gives the tip pill as 44 px on desktop. Stitch renders 48 px (`w-12`). Either is fine because the source is 1080 px.

## 5. Environmental sensor icons

| Sensor | Satellite | Hardware | Comfort band | Expected file (per guide) | Status |
|---|---|---|---|---|---|
| Temperature | North | DHT22 | 21–26 °C | `images/assets/icon_sun_cloud.jpg` | **Missing** |
| Humidity | South | DHT22 | 40–60 % | `images/assets/char_humidity_umbrella.jpg` | **Missing** |
| Ambient Light | East | BH1750 | 300–550 lx | `images/assets/icon_lightbulb.jpg` | **Missing** |
| Noise Level | West | MAX4466 | ≤ 55 dBA | `images/assets/icon_mic_headphones.jpg` | **Missing** |

Stitch renders these from remote `lh3.googleusercontent.com` URLs with `object-cover`, in circles (Temperature sometimes uses a rounded square). The `.jpg` extension implies an opaque background, which fits `object-cover` inside a white circle.

## 6. Missing assets and resolved decisions

### Missing (placeholders in use)
A full search of the extracted folder, the Stitch zip in Downloads, Desktop, Documents, Pictures and OneDrive found **no local files** for the items below. The Stitch CDN URLs (`lh3.googleusercontent.com/aida/…`) return a Google sign-in page rather than an image, so they are not usable as a source.

| ID | Asset | Expected file | Placeholder now shown | How to fix |
|---|---|---|---|---|
| M1 | Temperature icon | `icon_sun_cloud.jpg` | `device_thermostat` glyph on white | Put the file in `frontend/public/assets/sensors/` and set `SENSOR_ICONS.temp.src` |
| M1 | Humidity icon | `char_humidity_umbrella.jpg` | `water_drop` glyph | same, `SENSOR_ICONS.hum.src` |
| M1 | Ambient light icon | `icon_lightbulb.jpg` | `light_mode` glyph | same, `SENSOR_ICONS.light.src` |
| M1 | Noise icon | `icon_mic_headphones.jpg` | `graphic_eq` glyph | same, `SENSOR_ICONS.sound.src` |
| M2 | Settings gear illustration | unknown | `settings` glyph | Set `MISC_ICONS.settingsGear.src` |

Each placeholder is tagged with `data-placeholder-for="<expected file>"` in the DOM. Once `src` is set, `<SensorIcon/>` switches to the real image (`object-cover` in a white circle, as in Stitch) with no other code changes.

### Treats (resolved)
No treat illustration files exist in the supplied assets. In the Stitch design, the treat tiles use Material Symbols (`nutrition`, `bakery_dining`, `emoji_food_beverage`, `cookie`), and those remain the treat visuals. Stitch's per-treat "images" were Peekaboo expression PNGs (Berry→Happy, Toast→Celebrate, Tea→Encourage, Biscuit→Curious), which mixed two asset categories. That mapping is removed. The treat tile shows the treat glyph, and Peekaboo's reaction to any snack is **Celebrate** (guide: snack rewards). Defined in `TREATS` in `assetMap.js`.

### Resolved conflicts (C1–C7)
- C1 Offline → **Neutral** on all layouts.
- C2 Warning mapping → threshold-based, per §3. Low light or noise is not a warning unless it violates the configured threshold.
- C3 Tip bubble → dynamic, follows state.
- C4 Playtime default → **Happy** on desktop and mobile.
- C5 Treats → see above.
- C6 Source size is 1080×1080 (the guide's "512×512" is out of date). No change needed.
- C7 Neutral is a white character on a white frame. This is intended.
- Settings banner: Stitch used Encourage. Switched to **Happy** because the banner is informational and Encourage is reserved for warnings.

## 7. Next steps
- Supply the five missing files (M1, M2).
- Phase 3: swap the DEMO `SensorProvider` for Supabase/MQTT data. The rest of the UI consumes `{ connection, readings, series }` and needs no changes.
