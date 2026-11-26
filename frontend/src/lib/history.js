import { useEffect, useState } from 'react';
import { DEVICE_ID, getSupabase } from './supabaseClient.js';
import { SENSOR_ORDER, formatValue, sensorScore } from './environment.js';
import { rowToReading } from './realSource.js';

/** DEMO archive (from the Stitch prototype). */
export const DEMO_DATASETS = {
  daily: {
    title: 'Today’s Comfort Flow', avg: 94, rings: [92, 89, 95, 91], defaultIdx: 1,
    insight: 'Morning focus peak (96%) happened between 10:00 and 11:30 with 39 dBA quietness.',
    slots: [
      { label: '08:00', score: 91, temp: '22.4°C', light: '380 lx', hum: '46%', sound: '38 dBA' },
      { label: '10:00', score: 96, temp: '23.1°C', light: '440 lx', hum: '47%', sound: '39 dBA' },
      { label: '12:00', score: 92, temp: '24.2°C', light: '490 lx', hum: '49%', sound: '45 dBA' },
      { label: '15:00', score: 85, temp: '25.8°C', light: '460 lx', hum: '51%', sound: '48 dBA' },
      { label: '17:00', score: 93, temp: '23.6°C', light: '350 lx', hum: '48%', sound: '41 dBA' },
    ],
  },
  weekly: {
    title: '7-Day Comfort Rhythm', avg: 91, rings: [90, 88, 93, 87], defaultIdx: 1,
    insight: 'Tuesday and Friday hit 95% comfort with steady 435 lx daylight.',
    slots: [
      { label: 'Mon', score: 90, temp: '23.4°C', light: '410 lx', hum: '48%', sound: '43 dBA' },
      { label: 'Tue', score: 95, temp: '22.9°C', light: '435 lx', hum: '46%', sound: '39 dBA' },
      { label: 'Wed', score: 91, temp: '23.8°C', light: '420 lx', hum: '49%', sound: '42 dBA' },
      { label: 'Thu', score: 84, temp: '25.1°C', light: '390 lx', hum: '53%', sound: '51 dBA' },
      { label: 'Fri', score: 95, temp: '23.0°C', light: '445 lx', hum: '47%', sound: '40 dBA' },
    ],
  },
  monthly: {
    title: 'Monthly Comfort Arc', avg: 92, rings: [93, 91, 94, 89], defaultIdx: 1,
    insight: 'Your workspace comfort improved +4% in Week 4 after adjusting afternoon blinds.',
    slots: [
      { label: 'Wk 1', score: 88, temp: '24.1°C', light: '400 lx', hum: '50%', sound: '44 dBA' },
      { label: 'Wk 2', score: 91, temp: '23.6°C', light: '425 lx', hum: '48%', sound: '42 dBA' },
      { label: 'Wk 3', score: 93, temp: '23.2°C', light: '440 lx', hum: '47%', sound: '40 dBA' },
      { label: 'Wk 4', score: 95, temp: '22.9°C', light: '450 lx', hum: '46%', sound: '39 dBA' },
    ],
  },
};

const TITLES = { daily: 'Today’s Comfort Flow', weekly: '7-Day Comfort Rhythm', monthly: 'Monthly Comfort Arc' };

function bucketLabel(range, iso) {
  const d = new Date(iso);
  if (range === 'daily') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  if (range === 'weekly') return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const avg = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/** Build the same dataset shape as DEMO_DATASETS from reading_buckets() rows. */
export function bucketsToDataset(range, rows, cfg) {
  const slots = rows.map((r) => {
    const rd = rowToReading(r);
    const parts = SENSOR_ORDER.map((k) => sensorScore(k, rd[k], cfg)).filter((p) => p != null);
    return {
      label: bucketLabel(range, r.bucket_start),
      score: avg(parts) ?? '--',
      temp: formatValue('temp', rd.temp), light: formatValue('light', rd.light),
      hum: formatValue('hum', rd.hum), sound: formatValue('sound', rd.sound),
      _rd: rd,
    };
  });
  const rings = SENSOR_ORDER.map((k) => avg(slots.map((s) => sensorScore(k, s._rd[k], cfg)).filter((p) => p != null)));
  const best = slots.reduce((b, s) => (!b || s.score > b.score ? s : b), null);
  return {
    title: TITLES[range],
    avg: avg(slots.map((s) => s.score).filter(Number.isFinite)),
    rings,
    defaultIdx: Math.max(0, slots.length - 1),
    insight: best
      ? `Peak comfort (${best.score}%) at ${best.label} — ${best.temp}, ${best.light}, ${best.sound}.`
      : 'No stored readings for this range yet — data appears once the ESP32 starts publishing.',
    slots,
  };
}

/** History data for the current mode. REAL queries the reading_buckets RPC. */
export function useHistory(range, mode, cfg) {
  const [state, setState] = useState({ loading: false, error: null, dataset: null });
  useEffect(() => {
    if (mode !== 'real') return undefined;
    const sb = getSupabase();
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    sb.rpc('reading_buckets', { p_device_id: DEVICE_ID, p_range: range }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) setState({ loading: false, error: error.message, dataset: bucketsToDataset(range, [], cfg) });
      else setState({ loading: false, error: null, dataset: bucketsToDataset(range, data ?? [], cfg) });
    });
    return () => { cancelled = true; };
  }, [range, mode, cfg]);
  if (mode !== 'real') return { loading: false, error: null, dataset: DEMO_DATASETS[range] };
  return { ...state, dataset: state.dataset ?? bucketsToDataset(range, [], cfg) };
}
