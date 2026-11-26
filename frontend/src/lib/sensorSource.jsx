import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { settingsStore, useSettings } from './settingsStore.js';
import { SENSOR_ORDER, classify, comfortScore } from './environment.js';
import { useDataMode } from './dataMode.js';
import { useRealSource } from './realSource.js';

/**
 * Single data source for every page.
 *   DEMO: simulated ESP32 stream every 2.5 s (scenario switch drives each state).
 *   REAL: Supabase (readings written by the MQTT subscriber), Realtime + polling.
 * Both produce the same shape: { connection, readings, series } -> classify() -> env.
 */
export const SCENARIOS = [
  { key: 'normal', label: 'Normal' },
  { key: 'change', label: 'Shift' },
  { key: 'relax', label: 'Calm' },
  { key: 'warning', label: 'Warning' },
  { key: 'critical', label: 'Critical' },
  { key: 'offline', label: 'Offline' },
  { key: 'nodata', label: 'No Data' },
];

const SAMPLE_MS = 2500;
const HISTORY_LEN = 8;
const rnd = (a, b) => a + Math.random() * (b - a);
const r1 = (v) => Math.round(v * 10) / 10;

function generate(scenario, cfg) {
  const v = {
    temp: r1(rnd(23.0, 24.1)),
    light: Math.round(rnd(415, 460)),
    hum: Math.round(rnd(46, 51)),
    sound: Math.round(rnd(39, 45)),
  };
  if (scenario === 'change') v.sound = Math.round(cfg.maxNoise - rnd(2, 4));
  if (scenario === 'relax') { v.light = Math.round(cfg.minLux + rnd(18, 40)); v.sound = Math.round(rnd(35, 40)); }
  if (scenario === 'warning') v.temp = r1(cfg.maxTemp + rnd(0.4, 1.0));
  if (scenario === 'critical') { v.temp = r1(cfg.maxTemp + rnd(2.0, 2.6)); v.sound = Math.round(cfg.maxNoise + rnd(9, 12)); }
  return v;
}

const SEED = {
  temp: [23.1, 23.2, 23.3, 23.2, 23.4, 23.5, 23.3, 23.4],
  light: [420, 428, 430, 440, 432, 438, 434, 435],
  hum: [47, 48, 48, 49, 48, 47, 48, 48],
  sound: [40, 41, 43, 42, 44, 41, 42, 42],
};

/** DEMO stream. Paused (no timers) when inactive. */
function useDemoSource(active) {
  const [scenario, setScenarioState] = useState('normal');
  const [series, setSeries] = useState(SEED);
  const scenarioRef = useRef(scenario);

  const sample = useCallback(() => {
    const sc = scenarioRef.current;
    if (sc === 'offline' || sc === 'nodata') return;
    const next = generate(sc, settingsStore.get());
    setSeries((s) => Object.fromEntries(SENSOR_ORDER.map((k) => [k, [...s[k].slice(1 - HISTORY_LEN), next[k]]])));
  }, []);

  const setScenario = useCallback((sc) => {
    scenarioRef.current = sc;
    setScenarioState(sc);
    sample();
  }, [sample]);

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(sample, SAMPLE_MS);
    return () => clearInterval(id);
  }, [active, sample]);

  const connection = scenario === 'offline' ? 'offline' : 'online';
  const readings = scenario === 'offline' || scenario === 'nodata'
    ? null
    : Object.fromEntries(SENSOR_ORDER.map((k) => [k, series[k][series[k].length - 1]]));
  return { scenario, setScenario, sample, connection, readings, series };
}

const SensorContext = createContext(null);

export function SensorProvider({ children }) {
  const cfg = useSettings();
  const { mode, setMode, realAvailable } = useDataMode();
  const demo = useDemoSource(mode === 'demo');
  const real = useRealSource(mode === 'real');
  const [ledPing, setLedPing] = useState(0);

  const value = useMemo(() => {
    const isDemo = mode === 'demo';
    const src = isDemo ? demo : real;
    const env = classify({ connection: src.connection, readings: src.readings }, cfg);
    return {
      isDemo,
      mode, setMode, realAvailable,
      scenario: demo.scenario,
      setScenario: demo.setScenario,
      sample: isDemo ? demo.sample : real.refresh,
      connection: src.connection,
      readings: src.readings,
      series: src.series,
      env, cfg,
      score: comfortScore(src.readings, cfg),
      source: isDemo
        ? { label: 'Demo · Simulated', error: null, device: null, lastAt: null, loaded: true }
        : { label: 'Live · Supabase', error: real.error, device: real.device, lastAt: real.lastAt, loaded: real.loaded },
      ledPing, blinkLed: () => setLedPing((n) => n + 1),
    };
  }, [mode, setMode, realAvailable, demo, real, cfg, ledPing]);

  return <SensorContext.Provider value={value}>{children}</SensorContext.Provider>;
}

export function useSensors() {
  const ctx = useContext(SensorContext);
  if (!ctx) throw new Error('useSensors must be used inside <SensorProvider>');
  return ctx;
}
