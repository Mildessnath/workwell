/**
 * WorkWell — centralized visual asset map (single source of truth).
 * Details, sizes and open issues: docs/ASSET_MAPPING.md
 *
 * Files in frontend/public/assets/ are served from the web root.
 */

// BASE_URL is '/' locally and '/workwell/' on GitHub Pages.
const PEEKABOO_DIR = `${import.meta.env.BASE_URL}assets/peekaboo`;

/**
 * The six official Peekaboo expressions — 1080x1080 PNG, 1:1, opaque white bg.
 * Render ONLY via <Peekaboo/> (white circular frame, object-contain).
 * Never crop, stretch, recolor or filter.
 */
export const PEEKABOO = Object.freeze({
  happy: { key: 'happy', label: 'Happy', color: 'Yellow', alt: 'Peekaboo, happy',
    src: `${PEEKABOO_DIR}/a7c9af00-3c36-41bb-a7dc-c158ac9a9837.png` },
  celebrate: { key: 'celebrate', label: 'Celebrate', color: 'Red', alt: 'Peekaboo, celebrating',
    src: `${PEEKABOO_DIR}/c6130dfb-3f11-4ab7-aa1f-a4ebeeddc463.png` },
  sleepy: { key: 'sleepy', label: 'Sleepy', color: 'Purple', alt: 'Peekaboo, sleepy',
    src: `${PEEKABOO_DIR}/79ed381d-52f4-40b9-a45b-8b6831f801b5.png` },
  curious: { key: 'curious', label: 'Curious', color: 'Green', alt: 'Peekaboo, curious',
    src: `${PEEKABOO_DIR}/d8681424-c7b9-4070-94d5-6ea55b7b0d30.png` },
  encourage: { key: 'encourage', label: 'Encourage', color: 'Orange', alt: 'Peekaboo, encouraging',
    src: `${PEEKABOO_DIR}/65ea6de9-2ee9-47ac-bfd5-0a02930ff8c7.png` },
  neutral: { key: 'neutral', label: 'Neutral', color: 'Blank', alt: 'Peekaboo, neutral',
    src: `${PEEKABOO_DIR}/89fee179-c336-41f1-a9e0-8c8814fcaa37.png` },
});

/**
 * Application state -> expression (final mapping, approved 2026-11-27).
 * `critical` reuses Encourage; UI adds the coral critical indicator.
 */
export const STATE_EXPRESSION = Object.freeze({
  normal: 'happy',        // all readings comfortable
  change: 'curious',      // unusual drift toward a limit, no violation
  relax: 'sleepy',        // dim-but-acceptable light / relaxation
  warning: 'encourage',   // a threshold is violated
  critical: 'encourage',  // violated by a wide margin (+ critical indicator)
  offline: 'neutral',     // device connectivity lost
  nodata: 'neutral',      // connected, awaiting first sample
  achievement: 'celebrate', // mini-game / snack reward / peak insight
});

export function peekabooFor(state) {
  const key = STATE_EXPRESSION[state];
  if (!key) throw new Error(`Unknown Peekaboo state: ${state}`);
  return PEEKABOO[key];
}

/**
 * Environmental sensor icons (guide §2).
 * MISSING: originals not supplied locally; the Stitch CDN URLs require a
 * Google sign-in and do not load. Until supplied, <SensorIcon/> renders
 * `fallbackGlyph` (Material Symbols) as a clearly temporary placeholder.
 * To fix: drop the file in public/assets/sensors/ and set `src`.
 */
export const SENSOR_ICONS = Object.freeze({
  temp: { key: 'temp', label: 'Temperature', expectedFile: 'icon_sun_cloud.jpg',
    src: null, fallbackGlyph: 'device_thermostat', glyphColor: 'text-butter-ink' },
  hum: { key: 'hum', label: 'Humidity', expectedFile: 'char_humidity_umbrella.jpg',
    src: null, fallbackGlyph: 'water_drop', glyphColor: 'text-mint-ink' },
  light: { key: 'light', label: 'Ambient Light', expectedFile: 'icon_lightbulb.jpg',
    src: null, fallbackGlyph: 'light_mode', glyphColor: 'text-sky-ink' },
  sound: { key: 'sound', label: 'Noise Level', expectedFile: 'icon_mic_headphones.jpg',
    src: null, fallbackGlyph: 'graphic_eq', glyphColor: 'text-coral-ink' },
});

/** Settings gear illustration — MISSING (same situation as sensor icons). */
export const MISC_ICONS = Object.freeze({
  settingsGear: { key: 'settingsGear', label: 'Settings', expectedFile: null,
    src: null, fallbackGlyph: 'settings', glyphColor: 'text-electric' },
});

/**
 * Snack Pantry treats. A treat's own visual and Peekaboo's reaction are
 * separate asset categories:
 *  - `glyph`: the treat visual. The Stitch design itself uses these Material
 *    Symbols; no treat illustration files exist in the supplied assets.
 *  - Peekaboo's reaction to any snack is Celebrate (guide: "snack rewards").
 */
export const TREATS = Object.freeze([
  { key: 'berry', name: 'Lavender Berry', short: 'Berry', glyph: 'nutrition',
    tile: 'bg-lilac-soft hover:bg-lilac/70', ink: 'text-electric',
    quote: '“Mmm! Sweet lavender berries are my favorite!”' },
  { key: 'toast', name: 'Honey Toast', short: 'Toast', glyph: 'bakery_dining',
    tile: 'bg-butter/85 hover:bg-butter', ink: 'text-butter-ink',
    quote: '“Warm, golden, and crunchy — thank you!”' },
  { key: 'tea', name: 'Mint Tea', short: 'Mint Tea', glyph: 'emoji_food_beverage',
    tile: 'bg-mint-soft hover:bg-mint/75', ink: 'text-mint-ink',
    quote: '“So refreshing! Ready for a calm afternoon.”' },
  { key: 'biscuit', name: 'Star Biscuit', short: 'Biscuit', glyph: 'cookie',
    tile: 'bg-sky-soft hover:bg-sky/75', ink: 'text-sky-ink',
    quote: '“Ooh, sparkly crunch! Where did you find this?”' },
]);
