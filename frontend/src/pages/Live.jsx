import { useState } from 'react';
import Peekaboo from '../components/Peekaboo.jsx';
import SensorIcon from '../components/SensorIcon.jsx';
import ScenarioSwitch from '../components/ScenarioSwitch.jsx';
import TipBubble from '../components/TipBubble.jsx';
import AlertBanner from '../components/AlertBanner.jsx';
import DemoBadge from '../components/DemoBadge.jsx';
import Icon from '../components/Icon.jsx';
import { useSensors } from '../lib/sensorSource.jsx';
import { SENSORS, STATE_UI, formatValue, smoothPath } from '../lib/environment.js';
import { STATE_EXPRESSION } from '../assets/assetMap.js';

const SAT = {
  temp: { pos: '-top-4 left-1/2 -translate-x-1/2', shape: 'bg-butter rounded-[24px]', icon: 'rounded-xl', tag: 'text-butter-ink', beam: [210, 32], mbeam: [164, 26],
    mpos: '-top-2 left-1/2 -translate-x-1/2', mshape: 'bg-butter rounded-full px-3.5' },
  light: { pos: 'top-1/2 -right-8 -translate-y-1/2', shape: 'bg-sky rounded-[22px] rounded-tr-sm', icon: 'rounded-full', tag: 'text-sky-ink', beam: [388, 210], mbeam: [302, 164],
    mpos: 'top-1/2 -right-2 -translate-y-1/2', mshape: 'bg-sky rounded-[18px] rounded-tr-sm px-3' },
  hum: { pos: '-bottom-4 left-1/2 -translate-x-1/2', shape: 'bg-mint rounded-full rounded-tl-md', icon: 'rounded-full', tag: 'text-mint-ink', beam: [210, 388], mbeam: [164, 302],
    mpos: '-bottom-2 left-1/2 -translate-x-1/2', mshape: 'bg-mint rounded-full rounded-tl-md px-3.5' },
  sound: { pos: 'top-1/2 -left-10 -translate-y-1/2', shape: 'bg-coral-soft rounded-full', icon: 'rounded-full', tag: 'text-coral-ink', beam: [32, 210], mbeam: [26, 164],
    mpos: 'top-1/2 -left-2 -translate-y-1/2', mshape: 'bg-coral-soft rounded-full px-3' },
};
const LEVEL_RING = { warning: 'ring-4 ring-orange-ink/40', critical: 'ring-4 ring-coral animate-pulse' };

function WaveChart({ sensorKey, values, limit, W, H, padY, gradId, strokeW, dotR, className }) {
  const m = SENSORS[sensorKey].chart;
  const toY = (v) => Math.max(padY, Math.min(H - padY, H - padY - ((v - m.min) / (m.max - m.min)) * (H - padY * 2)));
  const pts = values.map((v, i) => [Math.round((i / (values.length - 1)) * (W - 24) + 12), Math.round(toY(v))]);
  const d = smoothPath(pts);
  const last = pts[pts.length - 1];
  const ly = Math.round(toY(limit));
  return (
    <svg viewBox={`0 0 ${W} ${H + 15}`} className={`w-full overflow-visible ${className}`} role="img" aria-label={`${SENSORS[sensorKey].stream} — last ${values.length} samples`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6C3CE9" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#6C3CE9" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <line x1="0" y1={ly} x2={W} y2={ly} stroke="#941736" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.55" />
      <path d={`${d} L ${last[0]} ${H} L ${pts[0][0]} ${H} Z`} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={m.color} strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={dotR} fill={m.color} stroke="#FFFFFF" strokeWidth="2.5" />
    </svg>
  );
}

function coreText(state) {
  const ui = STATE_UI[state];
  return { normal: 'Normal · Happy', change: 'Shift · Curious', relax: 'Calm · Sleepy', warning: 'Warning · Encourage',
    critical: 'Critical · Alert', offline: 'Offline · Neutral', nodata: 'No Data · Neutral' }[state] ?? ui.label;
}

export default function Live() {
  const [active, setActive] = useState('temp');
  const data = useSensors();
  return (
    <>
      <div className="hidden xl:block"><LiveDesktop active={active} setActive={setActive} {...data} /></div>
      <div className="xl:hidden"><LiveMobile active={active} setActive={setActive} {...data} /></div>
    </>
  );
}

function Core({ env, size }) {
  const ui = STATE_UI[env.state];
  const critical = env.state === 'critical';
  const big = size === 'desktop';
  return (
    <div className={`relative ${big ? 'w-48 h-48 border-4 p-4 shadow-[0_18px_40px_rgba(108,60,233,0.16)]' : 'w-36 h-36 border-4 p-2.5 shadow-lg'} rounded-full bg-white border-electric/20 flex flex-col items-center justify-center text-center z-10`}>
      <span className={`absolute ${critical ? (big ? '-inset-5' : '-inset-4') : (big ? '-inset-2' : '-inset-1.5')} rounded-full ${ui.halo} ${critical ? 'halo-pulse-fast' : 'halo-pulse'} -z-10`} aria-hidden="true" />
      <Peekaboo expression={STATE_EXPRESSION[env.state]} className={big ? 'w-24 h-24 mb-1.5' : 'w-[72px] h-[72px] mb-1'} pad="p-1" />
      <span className={`rounded-full ${ui.badgeCls} ${big ? 'px-3 text-[11px]' : 'px-2.5 text-[10px]'} py-0.5 font-extrabold`}>
        {big ? coreText(env.state) : ui.pill}
      </span>
    </div>
  );
}

function LiveDesktop({ active, setActive, env, readings, series, cfg, sample, blinkLed }) {
  const m = SENSORS[active];
  const hasData = !!readings && series[active].every(Number.isFinite);
  const beam = SAT[active].beam;
  return (
    <main className="min-w-0 px-10 py-7 max-w-[1200px] mx-auto min-h-screen flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-ink tracking-tight">Live Orbital Telemetry</h1>
            <DemoBadge className="text-xs px-3">Demo · Simulated</DemoBadge>
          </div>
          <p className="text-sm text-muted font-semibold mt-0.5">Animated satellites pulse as readings update against your saved comfort thresholds</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ScenarioSwitch />
          <button type="button" onClick={sample} className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-lilac text-electric px-3.5 py-2 text-xs font-bold hover:bg-lilac-soft transition-colors">
            <Icon name="refresh" className="text-base" /> Sample
          </button>
          <button type="button" onClick={blinkLed} className="inline-flex items-center gap-1.5 rounded-full bg-electric text-white px-3.5 py-2 text-xs font-bold shadow-sm">
            <Icon name="lightbulb" className="text-base" /> Blink LED
          </button>
        </div>
      </header>
      <AlertBanner />
      <div className="grid grid-cols-12 gap-8 items-center flex-1">
        <section className="col-span-6 relative flex items-center justify-center min-h-[520px]">
          <div className="absolute w-[440px] h-[440px] rounded-full bg-lilac-soft/90 pointer-events-none" />
          <div className="relative w-[420px] h-[420px] flex items-center justify-center">
            <svg viewBox="0 0 420 420" className={`absolute inset-0 w-full h-full pointer-events-none ${env.state === 'offline' ? 'opacity-40' : ''}`}>
              <circle cx="210" cy="210" r="198" fill="none" stroke="#6C3CE9" strokeWidth="2" strokeDasharray="7 9" opacity="0.28" className="ring-spin" />
              <circle cx="210" cy="210" r="146" fill="none" stroke="#B79EFF" strokeWidth="2.5" opacity="0.55" />
              <line x1="210" y1="210" x2={beam[0]} y2={beam[1]} stroke="#6C3CE9" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" opacity="0.85" />
              <circle cx={beam[0]} cy={beam[1]} r="6" fill="#6C3CE9" />
            </svg>
            <Core env={env} size="desktop" />
            {Object.entries(SAT).map(([k, c]) => {
              const sel = active === k;
              return (
                <button key={k} type="button" onClick={() => setActive(k)} aria-pressed={sel}
                  className={`absolute ${c.pos} ${c.shape} border-[3px] ${sel ? 'border-electric scale-105' : 'border-white'} ${LEVEL_RING[env.levels[k]] ?? ''} px-4 py-2.5 flex items-center gap-2.5 z-20 shadow-lg transition-transform`}>
                  <SensorIcon sensor={k} className="w-9 h-9" shape={c.icon} />
                  <div className="text-left">
                    <span className={`text-[10px] font-extrabold uppercase block ${c.tag}`}>{SENSORS[k].short}</span>
                    <span className="font-display text-lg font-bold text-ink tabular-nums">{formatValue(k, readings?.[k])}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
        <section className="col-span-6 flex flex-col gap-5">
          <div className="rounded-[36px] bg-white border-2 border-lilac p-6 flex flex-col gap-4 shadow-[0_14px_34px_rgba(108,60,233,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display text-2xl text-ink block leading-tight">{m.stream}</span>
                <span className="text-xs font-bold text-muted">Threshold {m.dir}: <span className="font-mono text-electric">{formatValue(active, cfg[m.limitKey])}</span></span>
              </div>
              <span className={`rounded-full px-4 py-1.5 font-display text-xl font-bold tabular-nums ${m.chipCls}`}>{formatValue(active, readings?.[active])}</span>
            </div>
            {hasData ? (
              <WaveChart sensorKey={active} values={series[active]} limit={cfg[m.limitKey]} W={480} H={165} padY={16} gradId="liveWaveGrad" strokeW={3.5} dotR={6.5} className="h-44" />
            ) : (
              <div className="h-44 rounded-3xl bg-canvas flex items-center justify-center text-sm font-bold text-muted">
                {env.state === 'offline' ? 'Stream paused — device offline' : 'Waiting for the first sample…'}
              </div>
            )}
            <div className="flex items-center justify-between font-mono text-[11px] text-muted">
              <span>-20s</span><span>-10s</span><span>Live Now</span>
            </div>
          </div>
          <TipBubble title="Peekaboo’s Live Note" />
        </section>
      </div>
    </main>
  );
}

function LiveMobile({ active, setActive, env, readings, series, cfg, sample }) {
  const m = SENSORS[active];
  const beam = SAT[active].mbeam;
  return (
    <div className="max-w-md mx-auto flex flex-col pb-24">
      <header className="px-5 pt-4 pb-2 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl text-ink leading-none">Live Orbit</h1>
            <span className="rounded-full bg-lilac-soft text-electric px-2.5 py-0.5 font-mono text-[10px] font-bold">2.5s</span>
            <DemoBadge />
          </div>
          <span className="text-[11px] font-semibold text-muted">Tap any satellite to inspect live wave</span>
        </div>
        <button type="button" onClick={sample} aria-label="Sample now" className="w-9 h-9 rounded-full bg-white border-2 border-lilac text-electric flex items-center justify-center active:scale-95">
          <Icon name="refresh" className="text-lg" />
        </button>
      </header>
      <div className="px-5 py-1"><ScenarioSwitch compact /></div>
      <main className="px-4 py-2 flex flex-col items-center gap-4">
        <div className="w-full"><AlertBanner compact /></div>
        <section className="relative w-[328px] h-[328px] flex items-center justify-center my-1">
          <div className="absolute inset-2 rounded-full bg-lilac-soft pointer-events-none" />
          <svg viewBox="0 0 328 328" className={`absolute inset-0 w-full h-full pointer-events-none ${env.state === 'offline' ? 'opacity-40' : ''}`}>
            <circle cx="164" cy="164" r="150" fill="none" stroke="#6C3CE9" strokeWidth="2" strokeDasharray="6 8" opacity="0.28" className="ring-spin" />
            <circle cx="164" cy="164" r="114" fill="none" stroke="#B79EFF" strokeWidth="2.5" opacity="0.55" />
            <line x1="164" y1="164" x2={beam[0]} y2={beam[1]} stroke="#6C3CE9" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="5 5" opacity="0.85" />
          </svg>
          <Core env={env} size="mobile" />
          {Object.entries(SAT).map(([k, c]) => {
            const sel = active === k;
            return (
              <button key={k} type="button" onClick={() => setActive(k)} aria-pressed={sel} aria-label={SENSORS[k].label}
                className={`absolute ${c.mpos} ${c.mshape} border-2 ${sel ? 'border-electric scale-105' : 'border-white'} ${LEVEL_RING[env.levels[k]] ?? ''} py-1.5 flex items-center gap-1.5 z-20 shadow-md transition-transform`}>
                <SensorIcon sensor={k} className="w-6 h-6" glyphSize="text-sm" />
                <span className="font-display text-sm font-bold text-ink tabular-nums">{formatValue(k, readings?.[k])}</span>
              </button>
            );
          })}
        </section>
        <section className="w-full rounded-[32px] bg-white border-2 border-lilac p-4 flex flex-col gap-2.5 shadow-[0_10px_28px_rgba(108,60,233,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-display text-base text-ink block leading-tight">{m.stream}</span>
              <span className="text-[11px] font-bold text-muted">Threshold {m.dir}: <span className="font-mono text-electric">{formatValue(active, cfg[m.limitKey])}</span></span>
            </div>
            <span className={`rounded-full px-3 py-1 font-display text-sm font-bold tabular-nums ${m.chipCls}`}>{formatValue(active, readings?.[active])}</span>
          </div>
          {readings && series[active].every(Number.isFinite) ? (
            <WaveChart sensorKey={active} values={series[active]} limit={cfg[m.limitKey]} W={340} H={100} padY={12} gradId="mLiveGrad" strokeW={3} dotR={5} className="h-24" />
          ) : (
            <div className="h-24 rounded-2xl bg-canvas flex items-center justify-center text-xs font-bold text-muted">
              {env.state === 'offline' ? 'Stream paused — device offline' : 'Waiting for the first sample…'}
            </div>
          )}
        </section>
        <TipBubble variant="mobile" />
      </main>
    </div>
  );
}
