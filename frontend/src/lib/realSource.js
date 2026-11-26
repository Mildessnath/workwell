import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEVICE_ID, getSupabase } from './supabaseClient.js';
import { SENSOR_ORDER } from './environment.js';
import { settingsStore } from './settingsStore.js';

const HISTORY_LEN = 8;
const POLL_MS = 10000;          // safety net if Realtime is not enabled
const MIN_STALE_MS = 30000;     // offline when no reading for max(30 s, 4 × sample interval)
const COLS = 'recorded_at,temperature_c,humidity_pct,light_lux,noise_dba';

const num = (v) => (v == null ? null : Number(v));
export function rowToReading(r) {
  return { temp: num(r.temperature_c), hum: num(r.humidity_pct), light: num(r.light_lux), sound: num(r.noise_dba) };
}

/** Oldest→newest rows to fixed-length series per sensor (gaps filled forward). */
function toSeries(rowsAsc) {
  const out = {};
  for (const k of SENSOR_ORDER) {
    const vals = rowsAsc.map((r) => rowToReading(r)[k]);
    let last = vals.find((v) => v != null) ?? null;
    const filled = vals.map((v) => (v == null ? last : (last = v)));
    const s = filled.slice(-HISTORY_LEN);
    out[k] = s.length === 1 ? [s[0], s[0]] : s;
  }
  return out;
}

const THRESHOLD_COLS = { max_temp_c: 'maxTemp', min_light_lux: 'minLux', max_humidity_pct: 'maxHum', max_noise_dba: 'maxNoise' };

/** Live data from Supabase for one device. Idle (no network) when `enabled` is false. */
export function useRealSource(enabled) {
  const [rows, setRows] = useState([]);        // newest first
  const [device, setDevice] = useState(null);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const [dev, rd] = await Promise.all([
      sb.from('devices').select('id,name,firmware,sample_interval_ms,status,last_seen_at').eq('id', DEVICE_ID).maybeSingle(),
      sb.from('sensor_readings').select(COLS).eq('device_id', DEVICE_ID).order('recorded_at', { ascending: false }).limit(HISTORY_LEN),
    ]);
    if (!alive.current) return;
    if (dev.error || rd.error) {
      setError((dev.error || rd.error).message);
    } else if (!dev.data) {
      setError(`Device “${DEVICE_ID}” not found or not readable (run supabase/seed.sql; check is_public / sign-in).`);
    } else {
      setError(null);
    }
    if (dev.data) setDevice(dev.data);
    if (rd.data) setRows(rd.data);
    setLoaded(true);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    alive.current = true;
    if (!enabled) return () => { alive.current = false; };
    const sb = getSupabase();
    refresh();
    // Pull thresholds so the UI evaluates against the same values as the subscriber.
    sb.from('environment_thresholds').select(Object.keys(THRESHOLD_COLS).join(',')).eq('device_id', DEVICE_ID).maybeSingle()
      .then(({ data }) => {
        if (!data || !alive.current) return;
        const patch = {};
        for (const [col, key] of Object.entries(THRESHOLD_COLS)) if (data[col] != null) patch[key] = Number(data[col]);
        settingsStore.set(patch);
      });
    const channel = sb.channel(`workwell-${DEVICE_ID}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `device_id=eq.${DEVICE_ID}` },
        ({ new: r }) => {
          setRows((prev) => [r, ...prev.filter((p) => p.recorded_at !== r.recorded_at)]
            .sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1)).slice(0, HISTORY_LEN));
          setNow(Date.now());
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'devices', filter: `id=eq.${DEVICE_ID}` },
        ({ new: d }) => setDevice((prev) => ({ ...prev, ...d })))
      .subscribe();
    const poll = setInterval(refresh, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 5000);
    return () => {
      alive.current = false;
      clearInterval(poll);
      clearInterval(tick);
      sb.removeChannel(channel);
    };
  }, [enabled, refresh]);

  return useMemo(() => {
    const latest = rows[0];
    const staleMs = Math.max(MIN_STALE_MS, 4 * (device?.sample_interval_ms ?? 2500));
    const lastAt = latest ? Date.parse(latest.recorded_at) : null;
    const stale = lastAt != null && now - lastAt > staleMs;
    // Not loaded / device unreadable -> "No Data" (error is surfaced separately).
    // Device reported offline (LWT/watchdog) or data went stale -> "Offline".
    // Device known but never sent a reading -> "No Data".
    let connection = 'online';
    if (device && (device.status === 'offline' || stale)) connection = 'offline';
    const readings = device && latest && connection === 'online' ? rowToReading(latest) : null;
    const series = toSeries([...rows].reverse());
    return { loaded, error, device, connection, readings, series, lastAt, refresh };
  }, [rows, device, now, loaded, error, refresh]);
}

/** Push thresholds to Supabase. Returns 'synced' | 'local-only' | 'error'. */
export async function pushThresholds(cfg) {
  const sb = getSupabase();
  if (!sb) return 'local-only';
  const row = Object.fromEntries(Object.entries(THRESHOLD_COLS).map(([col, key]) => [col, cfg[key]]));
  const { data, error } = await sb.from('environment_thresholds').update(row).eq('device_id', DEVICE_ID).select('device_id');
  if (error) return 'error';
  return data?.length ? 'synced' : 'local-only'; // 0 rows = RLS: only the signed-in owner may write
}
