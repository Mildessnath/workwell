import { useEffect, useRef, useState } from 'react';
import Peekaboo from '../components/Peekaboo.jsx';
import SensorIcon from '../components/SensorIcon.jsx';
import DemoBadge from '../components/DemoBadge.jsx';
import DataModeToggle from '../components/DataModeToggle.jsx';
import { pushThresholds } from '../lib/realSource.js';
import { settingsStore, useSettings, resetSettings } from '../lib/settingsStore.js';
import { useSensors } from '../lib/sensorSource.jsx';

const SLIDERS = [
  { key: 'maxTemp', sensor: 'temp', label: 'Max Temperature', hw: 'DHT22 · GPIO4', min: 22, max: 30, step: 0.5, fmt: (v) => `${Number(v).toFixed(1)}°C`,
    card: 'bg-butter/85', ink: 'text-butter-ink', shape: 'rounded-xl', mshape: 'rounded-lg' },
  { key: 'minLux', sensor: 'light', label: 'Min Ambient Light', hw: 'BH1750 · I2C', min: 150, max: 500, step: 10, fmt: (v) => `${v} lx`,
    card: 'bg-sky/80', ink: 'text-sky-ink', shape: 'rounded-full', mshape: 'rounded-full' },
  { key: 'maxHum', sensor: 'hum', label: 'Max Humidity', hw: 'DHT22 · Relative %', min: 45, max: 75, step: 1, fmt: (v) => `${v}%`,
    card: 'bg-mint/80', ink: 'text-mint-ink', shape: 'rounded-full', mshape: 'rounded-full' },
  { key: 'maxNoise', sensor: 'sound', label: 'Max Noise Level', hw: 'MAX4466 · Acoustic', min: 45, max: 75, step: 1, fmt: (v) => `${v} dBA`,
    card: 'bg-coral-soft', ink: 'text-coral-ink', shape: 'rounded-full', mshape: 'rounded-full' },
];

const TOGGLES = [
  { key: 'ledPulse', label: 'RGB LED Alert Pulse', hint: 'Blink amber when comfort drifts', mobile: 'RGB LED Alert Pulse' },
  { key: 'chime', label: 'Gentle Sound Chime', hint: 'Soft chime for prolonged alerts', mobile: 'Gentle Sound Chime' },
  { key: 'nightDim', label: 'Night Auto-Dim', hint: 'Dim hardware LED after 20:00', mobile: 'Night Mode Auto-Dim (20:00+)' },
];

const THRESHOLD_KEYS = new Set(['maxTemp', 'minLux', 'maxHum', 'maxNoise']);
const SYNC_TEXT = {
  synced: 'Saved & synced to Supabase ✓',
  'local-only': 'Saved locally · cloud sync needs owner sign-in',
  error: 'Saved locally · Supabase sync failed',
};

function useSavedToast() {
  const [msg, setMsg] = useState(null);
  const t = useRef();
  useEffect(() => () => clearTimeout(t.current), []);
  const flash = (text = 'Saved ✓', ms = 1200) => { setMsg(text); clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), ms); };
  return [msg, flash];
}

export default function Settings() {
  const cfg = useSettings();
  const { connection, mode, source } = useSensors();
  const [saved, flash] = useSavedToast();
  const syncTimer = useRef();
  useEffect(() => () => clearTimeout(syncTimer.current), []);
  // REAL mode: debounce slider drags, then push thresholds so the subscriber uses them too.
  const sync = () => {
    if (mode !== 'real') return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      const result = await pushThresholds(settingsStore.get());
      flash(SYNC_TEXT[result], 3500);
    }, 600);
  };
  const update = (key, value) => { settingsStore.set({ [key]: value }); flash(); if (THRESHOLD_KEYS.has(key)) sync(); };
  const reset = () => { resetSettings(); flash(); sync(); };
  const device = mode === 'real' ? source.device : null;
  const props = { cfg, update, reset, saved, online: connection === 'online', device, mode };
  return (
    <>
      <div className="hidden xl:block"><SettingsDesktop {...props} /></div>
      <div className="xl:hidden"><SettingsMobile {...props} /></div>
    </>
  );
}

function SettingsDesktop({ cfg, update, reset, saved, online, device, mode }) {
  return (
    <main className="min-w-0 px-10 py-7 max-w-[1160px] mx-auto min-h-screen flex flex-col gap-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink tracking-tight">Orbit Tuning &amp; Device</h1>
          <p className="text-sm text-muted font-semibold mt-0.5">Configure comfort thresholds, notifications, and your ESP32 hardware companion</p>
        </div>
        <div className="flex items-center gap-2.5">
          <span aria-live="polite" className="rounded-full bg-mint-soft text-mint-ink px-3.5 py-1.5 font-mono text-xs font-bold">{saved ?? 'Synced with Live Orbit'}</span>
          <button type="button" onClick={reset} className="rounded-full bg-white border-2 border-lilac text-electric px-4 py-1.5 text-xs font-bold hover:bg-lilac-soft transition-colors">Reset Defaults</button>
        </div>
      </header>
      <section className="rounded-[34px] bg-electric text-white p-5 flex items-center justify-between gap-4 shadow-[0_14px_30px_rgba(108,60,233,0.22)]">
        <div className="flex items-center gap-4">
          <Peekaboo expression="happy" className="w-14 h-14" />
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-butter block">Comfort Band Sync</span>
            <p className="text-sm font-bold">Thresholds saved here immediately update Peekaboo’s alerts in Home and Live Stream.</p>
          </div>
        </div>
        <SensorIcon misc="settingsGear" className="w-12 h-12" glyphSize="text-2xl" />
      </section>
      <div className="grid grid-cols-12 gap-7 items-start">
        <section className="col-span-7 flex flex-col gap-4">
          {SLIDERS.map((s) => (
            <div key={s.key} className={`rounded-[30px] ${s.card} border-2 border-white p-5 flex flex-col gap-2.5 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <SensorIcon sensor={s.sensor} className="w-10 h-10" shape={s.shape} />
                  <div><label htmlFor={`rng-${s.key}`} className="font-display text-base text-ink block">{s.label}</label><span className={`text-xs font-bold ${s.ink}`}>{s.hw}</span></div>
                </div>
                <span className="font-display text-2xl font-bold text-ink tabular-nums">{s.fmt(cfg[s.key])}</span>
              </div>
              <input id={`rng-${s.key}`} type="range" min={s.min} max={s.max} step={s.step} value={cfg[s.key]}
                onChange={(e) => update(s.key, Number(e.target.value))} className="w-full h-6 cursor-pointer" />
            </div>
          ))}
        </section>
        <section className="col-span-5 flex flex-col gap-5">
          <div className="rounded-[34px] bg-white border-2 border-lilac p-6 flex flex-col gap-4 shadow-[0_14px_34px_rgba(108,60,233,0.08)]">
            <div>
              <h2 className="font-display text-xl text-ink">Alerts &amp; RGB LED</h2>
              <p className="text-xs text-muted font-semibold mt-0.5">Saved now · applied by the ESP32 once it’s connected</p>
            </div>
            {TOGGLES.map((t) => (
              <label key={t.key} className="flex items-center justify-between gap-3 cursor-pointer py-1">
                <div><span className="text-sm font-bold text-ink block">{t.label}</span><span className="text-xs text-muted">{t.hint}</span></div>
                <input type="checkbox" checked={!!cfg[t.key]} onChange={(e) => update(t.key, e.target.checked)} className="rounded-full text-electric focus:ring-electric h-6 w-6 shrink-0" />
              </label>
            ))}
          </div>
          <div className="rounded-[34px] bg-lilac-soft border-2 border-lilac p-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-ink">ESP32 Hardware</h2>
              <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold ${online ? 'bg-mint text-mint-ink' : 'bg-slate-200 text-slate-700'}`}>{online ? 'Connected' : 'Offline'}</span>
            </div>
            <div className="font-mono text-xs text-muted flex flex-col gap-1.5">
              <div className="flex justify-between"><span>Node</span><span className="text-ink font-semibold">{mode === 'real' ? (device?.name ?? '—') : 'WorkWell-ESP32-S3'}</span></div>
              <div className="flex justify-between"><span>Firmware</span><span className="text-ink font-semibold">{mode === 'real' ? (device?.firmware ?? '—') : 'v2.4.1-orbit'}</span></div>
              <div className="flex justify-between"><span>Sample Rate</span><span className="text-ink font-semibold">{mode === 'real' ? (device ? `${(device.sample_interval_ms / 1000).toFixed(1)}s interval` : '—') : '2.5s interval'}</span></div>
              {mode === 'real' && (
                <div className="flex justify-between"><span>Last Seen</span><span className="text-ink font-semibold">{device?.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'never'}</span></div>
              )}
            </div>
            <DemoBadge className="self-start">Demo device info</DemoBadge>
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-xs font-bold text-ink">Data source</span>
              <DataModeToggle className="w-40" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SettingsMobile({ cfg, update, reset, saved, online }) {
  return (
    <div className="max-w-md mx-auto flex flex-col pb-24">
      <header className="px-5 pt-4 pb-2 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl text-ink leading-none">Orbit Tuning</h1>
            <DemoBadge />
          </div>
          <span className="text-[11px] font-semibold text-muted">Syncs live with Peekaboo &amp; RGB LED</span>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold ${online ? 'bg-mint-soft border-mint text-mint-ink' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-mint-ink animate-pulse' : 'bg-slate-400'}`} /> ESP32 {online ? 'Online' : 'Offline'}
        </span>
      </header>
      <main className="px-4 py-2 flex flex-col gap-3.5">
        <section className="rounded-[30px] bg-electric text-white p-4 flex items-center gap-3 shadow-md">
          <Peekaboo expression="happy" className="w-12 h-12" />
          <p className="text-xs font-bold leading-snug flex-1">Adjust your comfort bands below. Live Orbit reacts immediately when a sensor drifts.</p>
          <SensorIcon misc="settingsGear" className="w-9 h-9" />
        </section>
        <section className="flex flex-col gap-2.5">
          {SLIDERS.map((s) => (
            <div key={s.key} className={`rounded-[26px] ${s.card} border-2 border-white p-3.5 flex flex-col gap-1.5 shadow-sm`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SensorIcon sensor={s.sensor} className="w-7 h-7" shape={s.mshape} glyphSize="text-base" />
                  <label htmlFor={`mrng-${s.key}`} className="text-xs font-extrabold text-ink">{s.label}</label>
                </div>
                <span className="font-display text-base font-bold text-ink tabular-nums">{s.fmt(cfg[s.key])}</span>
              </div>
              <input id={`mrng-${s.key}`} type="range" min={s.min} max={s.max} step={s.step} value={cfg[s.key]}
                onChange={(e) => update(s.key, Number(e.target.value))} className="w-full h-6 cursor-pointer" />
            </div>
          ))}
        </section>
        <section className="rounded-[28px] bg-white border-2 border-lilac p-4 flex flex-col gap-2.5">
          <p className="text-[11px] text-muted font-semibold">LED &amp; chime preferences are saved now and applied by the ESP32 once it’s connected.</p>
          {TOGGLES.map((t) => (
            <label key={t.key} className="flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-ink">{t.mobile}</span>
              <input type="checkbox" checked={!!cfg[t.key]} onChange={(e) => update(t.key, e.target.checked)} className="rounded-full text-electric focus:ring-electric h-6 w-6 shrink-0" />
            </label>
          ))}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-ink">Data source</span>
            <DataModeToggle className="w-36" />
          </div>
          <div className="pt-1 flex items-center justify-between gap-2">
            <span aria-live="polite" className="text-[11px] font-mono text-mint-ink font-bold">{saved ?? 'Synced with Live Orbit'}</span>
            <button type="button" onClick={reset} className="rounded-full bg-lilac-soft text-electric px-3.5 py-1 text-[11px] font-bold">Reset Defaults</button>
          </div>
        </section>
      </main>
    </div>
  );
}
