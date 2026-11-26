/**
 * Environment evaluation: readings + configured thresholds -> application state.
 *
 * Per-sensor levels:
 *   ok        comfortable
 *   near      within `near` of a max limit, not violated        -> state "change"  (Curious)
 *   dim       light above min but within `dimBand` of it          -> state "relax"   (Sleepy)
 *   warning   limit violated by less than `critical`              -> state "warning" (Encourage)
 *   critical  limit violated by `critical` or more                -> state "critical"(Encourage + alert)
 * Priority: offline > nodata > critical > warning > change > relax > normal.
 */

export const DEFAULT_THRESHOLDS = Object.freeze({ maxTemp: 26.5, maxHum: 60, minLux: 300, maxNoise: 58 });

export const SENSOR_ORDER = ['temp', 'light', 'hum', 'sound'];

export const SENSORS = Object.freeze({
  temp: {
    key: 'temp', label: 'Temperature', short: 'Temp', unit: '°C', decimals: 1,
    hw: 'DHT22 · GPIO4', limitKey: 'maxTemp', dir: 'max', near: 1.0, critical: 1.5, scale: 4,
    chart: { min: 18, max: 32, color: '#D97706' },
    chipCls: 'bg-butter text-butter-ink', focus: 'Temperature Focus', stream: 'Temperature Stream',
  },
  light: {
    key: 'light', label: 'Ambient Light', short: 'Light', unit: ' lx', decimals: 0,
    hw: 'BH1750 · I2C', limitKey: 'minLux', dir: 'min', dimBand: 60, critical: 100, scale: 150,
    chart: { min: 100, max: 650, color: '#0284C7' },
    chipCls: 'bg-sky text-sky-ink', focus: 'Daylight Focus', stream: 'Ambient Light Stream',
  },
  hum: {
    key: 'hum', label: 'Humidity', short: 'Humid', unit: '%', decimals: 0,
    hw: 'DHT22 · GPIO4', limitKey: 'maxHum', dir: 'max', near: 5, critical: 8, scale: 15,
    chart: { min: 30, max: 80, color: '#059669' },
    chipCls: 'bg-mint text-mint-ink', focus: 'Humidity Focus', stream: 'Humidity Stream',
  },
  sound: {
    key: 'sound', label: 'Noise Level', short: 'Sound', unit: ' dBA', decimals: 0,
    hw: 'MAX4466 · ADC', limitKey: 'maxNoise', dir: 'max', near: 5, critical: 8, scale: 15,
    chart: { min: 30, max: 80, color: '#E11D48' },
    chipCls: 'bg-coral-soft text-coral-ink', focus: 'Acoustics Focus', stream: 'Acoustic Stream',
  },
});

export function formatValue(key, v) {
  if (v == null || Number.isNaN(v)) return '—';
  const m = SENSORS[key];
  return (m.decimals ? Number(v).toFixed(m.decimals) : Math.round(v)) + m.unit;
}

export function formatLimit(key, cfg) {
  const m = SENSORS[key];
  const v = cfg[m.limitKey];
  return `${m.dir === 'max' ? 'Max' : 'Min'} ${formatValue(key, v)}`;
}

export function evaluateSensor(key, v, cfg) {
  const m = SENSORS[key];
  const limit = cfg[m.limitKey];
  if (v == null) return 'none';
  if (m.dir === 'max') {
    const over = v - limit;
    if (over >= m.critical) return 'critical';
    if (over > 0) return 'warning';
    if (limit - v <= m.near) return 'near';
    return 'ok';
  }
  const under = limit - v;
  if (under >= m.critical) return 'critical';
  if (under > 0) return 'warning';
  if (v < limit + m.dimBand) return 'dim';
  return 'ok';
}

const LEVEL_RANK = { critical: 5, warning: 4, near: 3, dim: 2, ok: 1, none: 0 };
const LEVEL_TO_STATE = { critical: 'critical', warning: 'warning', near: 'change', dim: 'relax', ok: 'normal' };

/**
 * @param {{connection:'online'|'offline', readings: Record<string,number>|null}} src
 * @returns {{state, levels, worstKey, alerts}}
 */
export function classify({ connection, readings }, cfg) {
  if (connection === 'offline') return { state: 'offline', levels: {}, worstKey: null, alerts: [] };
  if (!readings) return { state: 'nodata', levels: {}, worstKey: null, alerts: [] };
  const levels = {};
  let worstKey = null;
  for (const k of SENSOR_ORDER) {
    levels[k] = evaluateSensor(k, readings[k], cfg);
    if (!worstKey || LEVEL_RANK[levels[k]] > LEVEL_RANK[levels[worstKey]]) worstKey = k;
  }
  const alerts = SENSOR_ORDER
    .filter((k) => levels[k] === 'warning' || levels[k] === 'critical')
    .sort((a, b) => LEVEL_RANK[levels[b]] - LEVEL_RANK[levels[a]])
    .map((k) => ({ key: k, level: levels[k], text: alertText(k, readings[k], cfg) }));
  return { state: LEVEL_TO_STATE[levels[worstKey]] ?? 'normal', levels, worstKey, alerts };
}

function alertText(k, v, cfg) {
  const m = SENSORS[k];
  const lim = formatValue(k, cfg[m.limitKey]);
  return m.dir === 'max'
    ? `${m.label} ${formatValue(k, v)} exceeded ${lim}`
    : `${m.label} ${formatValue(k, v)} dropped below ${lim}`;
}

/** Visual treatment per state (badges, halo, sidebar LED). */
export const STATE_UI = Object.freeze({
  normal:   { label: 'Normal',   badge: 'Happy · All Clear',    pill: 'All Clear', badgeCls: 'bg-mint-soft text-mint-ink',   halo: 'bg-mint-soft/75', led: 'ESP32 · Calm LED',   ledBox: 'bg-mint-soft border-mint text-mint-ink',     ledDot: 'bg-mint-ink' },
  change:   { label: 'Shift',    badge: 'Curious · Shift',      pill: 'Shifting',  badgeCls: 'bg-sky-soft text-sky-ink',     halo: 'bg-sky-soft',     led: 'ESP32 · Soft Pulse', ledBox: 'bg-sky-soft border-sky text-sky-ink',        ledDot: 'bg-sky-ink' },
  relax:    { label: 'Calm',     badge: 'Sleepy · Calm',        pill: 'Calm',      badgeCls: 'bg-lilac-soft text-electric',  halo: 'bg-lilac-soft',   led: 'ESP32 · Soft Blue',  ledBox: 'bg-lilac-soft border-lilac text-electric',   ledDot: 'bg-electric' },
  warning:  { label: 'Warning',  badge: 'Encourage · Warning',  pill: 'Warning',   badgeCls: 'bg-orange text-orange-ink',    halo: 'bg-butter',       led: 'ESP32 · Amber LED',  ledBox: 'bg-orange border-butter text-orange-ink',    ledDot: 'bg-orange-ink' },
  critical: { label: 'Critical', badge: 'Critical · Alert',     pill: 'Alert',     badgeCls: 'bg-coral-soft text-coral-ink', halo: 'bg-coral-soft',   led: 'ESP32 · Coral Pulse', ledBox: 'bg-coral-soft border-coral text-coral-ink', ledDot: 'bg-coral-ink' },
  offline:  { label: 'Offline',  badge: 'ESP32 Offline',        pill: 'Offline',   badgeCls: 'bg-slate-100 text-slate-700',  halo: 'bg-slate-100',    led: 'ESP32 · Offline',    ledBox: 'bg-slate-100 border-slate-200 text-slate-600', ledDot: 'bg-slate-400' },
  nodata:   { label: 'No Data',  badge: 'Neutral · No Data',    pill: 'No Data',   badgeCls: 'bg-slate-100 text-slate-700',  halo: 'bg-slate-100',    led: 'ESP32 · Waiting',    ledBox: 'bg-slate-100 border-slate-200 text-slate-600', ledDot: 'bg-slate-400' },
});

const ACTIONS = {
  temp: 'open a window or turn on a desk fan',
  light: 'switch on your warm desk lamp',
  hum: 'ventilate the room or run a dehumidifier',
  sound: 'try noise-canceling headphones for focus',
};

/** Peekaboo's tip text — always matches the current state. */
export function tipFor(env, readings, cfg) {
  const { state, worstKey } = env;
  const r = readings || {};
  switch (state) {
    case 'offline': return 'ESP32 disconnected from HiveMQ Cloud — waiting for it to reconnect.';
    case 'nodata': return 'Subscribed to the sensor topic — waiting for the first reading.';
    case 'critical':
    case 'warning': {
      const m = SENSORS[worstKey];
      const verb = m.dir === 'max' ? 'is above' : 'is below';
      const pre = state === 'critical' ? 'Critical: ' : '';
      return `${pre}${m.short} ${formatValue(worstKey, r[worstKey])} ${verb} your ${formatValue(worstKey, cfg[m.limitKey])} limit — ${ACTIONS[worstKey]}.`;
    }
    case 'change': {
      const m = SENSORS[worstKey];
      return `${m.short} is drifting to ${formatValue(worstKey, r[worstKey])}, close to your ${formatValue(worstKey, cfg[m.limitKey])} limit — Peekaboo is keeping an eye on it.`;
    }
    case 'relax':
      return `Soft ${formatValue('light', r.light)} lighting — cozy for a calm break. Brighten up when it’s focus time.`;
    default:
      return `All 4 sensors are inside your comfort band — ${formatValue('light', r.light)} daylight is balanced.`;
  }
}

/** Per-sensor inspector line on the Home orbit. */
export function sensorQuote(key, level, v) {
  if (level === 'critical') return '“Way past your limit — let’s fix this one first.”';
  if (level === 'warning') return '“Just over your comfort limit — a small adjustment will help.”';
  if (level === 'near') return '“Getting close to your limit — I’m watching this one.”';
  if (level === 'dim') return '“Soft, dim light — lovely for winding down.”';
  if (level === 'none') return '“No reading yet for this satellite.”';
  return {
    temp: '“Cozy thermal balance! Peekaboo is right at peak comfort.”',
    light: '“Crisp natural daylight keeps eye strain away.”',
    hum: `“Fresh ${formatValue('hum', v)} humidity — breathable and gentle.”`,
    sound: `“Soft ${formatValue('sound', v)} hum — great for deep focus!”`,
  }[key];
}

export const LEVEL_STATUS = Object.freeze({
  ok: { text: 'Within Band', cls: 'bg-mint-soft text-mint-ink' },
  near: { text: 'Near Limit', cls: 'bg-sky-soft text-sky-ink' },
  dim: { text: 'Dim · OK', cls: 'bg-lilac-soft text-electric' },
  warning: { text: 'Over Limit', cls: 'bg-orange text-orange-ink' },
  critical: { text: 'Critical', cls: 'bg-coral-soft text-coral-ink' },
  none: { text: 'No Signal', cls: 'bg-slate-100 text-slate-600' },
});

/** 0–100 comfort score from readings vs thresholds. */
export function sensorScore(k, v, cfg) {
  if (v == null || Number.isNaN(v)) return null;
  const m = SENSORS[k];
  const lim = cfg[m.limitKey];
  const headroom = m.dir === 'max' ? (lim - v) / m.scale : (v - lim) / m.scale;
  if (headroom < 0) return Math.max(35, 78 + headroom * 40);
  return Math.min(100, 84 + headroom * 16);
}

export function comfortScore(readings, cfg) {
  if (!readings) return null;
  const parts = SENSOR_ORDER.map((k) => sensorScore(k, readings[k], cfg)).filter((p) => p != null);
  if (!parts.length) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
}

/** Smooth SVG path through points (same curve as the Stitch charts). */
export function smoothPath(pts) {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const cx = (pts[i - 1][0] + pts[i][0]) / 2;
    d += ` C ${cx} ${pts[i - 1][1]}, ${cx} ${pts[i][1]}, ${pts[i][0]} ${pts[i][1]}`;
  }
  return d;
}
