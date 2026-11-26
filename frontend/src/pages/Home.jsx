import { useRef, useState } from 'react';
import Peekaboo from '../components/Peekaboo.jsx';
import SensorIcon from '../components/SensorIcon.jsx';
import ScenarioSwitch from '../components/ScenarioSwitch.jsx';
import TipBubble from '../components/TipBubble.jsx';
import AlertBanner from '../components/AlertBanner.jsx';
import DemoBadge from '../components/DemoBadge.jsx';
import { useSensors } from '../lib/sensorSource.jsx';
import { SENSORS, STATE_UI, LEVEL_STATUS, formatValue, formatLimit, sensorQuote } from '../lib/environment.js';
import { STATE_EXPRESSION } from '../assets/assetMap.js';

/* Satellite styling per cardinal position (from Stitch Bold Universe). */
const SAT = {
  temp: { bob: 'sat-bob-1', pos: '-top-5 left-1/2 -translate-x-1/2', shape: 'bg-butter rounded-[28px]', shadow: 'shadow-[0_12px_28px_rgba(245,158,11,0.28)]', iconShape: 'rounded-2xl rotate-6', tag: 'text-butter-ink', tagText: 'Temp · DHT22', beam: [260, 54], mbeam: [168, 28],
    mpos: '-top-3 left-1/2 -translate-x-1/2', mshape: 'bg-butter rounded-full px-3.5' },
  light: { bob: 'sat-bob-2', pos: 'top-1/2 -right-12 -translate-y-1/2', shape: 'bg-sky rounded-[26px] rounded-tr-md', shadow: 'shadow-[0_12px_28px_rgba(10,85,122,0.18)]', iconShape: 'rounded-full', tag: 'text-sky-ink', tagText: 'Light · BH1750', beam: [464, 260], mbeam: [308, 168],
    mpos: 'top-1/2 -right-2 -translate-y-1/2', mshape: 'bg-sky rounded-[20px] rounded-tr-sm px-3' },
  hum: { bob: 'sat-bob-3', pos: '-bottom-5 left-1/2 -translate-x-1/2', shape: 'bg-mint rounded-full rounded-tl-lg', shadow: 'shadow-[0_12px_28px_rgba(11,93,59,0.18)]', iconShape: 'rounded-full', tag: 'text-mint-ink', tagText: 'Humidity', beam: [260, 466], mbeam: [168, 308],
    mpos: '-bottom-3 left-1/2 -translate-x-1/2', mshape: 'bg-mint rounded-full rounded-tl-md px-3.5' },
  sound: { bob: 'sat-bob-4', pos: 'top-1/2 -left-14 -translate-y-1/2', shape: 'bg-coral-soft rounded-full', shadow: 'shadow-[0_12px_28px_rgba(148,23,54,0.16)]', iconShape: 'rounded-full', tag: 'text-coral-ink', tagText: 'Acoustics', beam: [56, 260], mbeam: [28, 168],
    mpos: 'top-1/2 -left-2 -translate-y-1/2', mshape: 'bg-coral-soft rounded-full px-3' },
};

const LEVEL_RING = { warning: 'ring-4 ring-orange-ink/40', critical: 'ring-4 ring-coral animate-pulse' };

function EqBars({ small }) {
  return (
    <span className={`inline-flex items-end gap-0.5 ${small ? 'h-3.5' : 'h-4'}`} aria-hidden="true">
      <span className={`${small ? 'w-0.5 h-2' : 'w-1 h-2.5'} bg-coral rounded-full eq-1`} />
      <span className={`${small ? 'w-0.5 h-3.5' : 'w-1 h-4'} bg-coral rounded-full eq-2`} />
      <span className={`${small ? 'w-0.5 h-2.5' : 'w-1 h-3'} bg-coral rounded-full eq-3`} />
    </span>
  );
}

export default function Home() {
  const [active, setActive] = useState('temp');
  const data = useSensors();
  return (
    <>
      <div className="hidden xl:block"><HomeDesktop active={active} setActive={setActive} {...data} /></div>
      <div className="xl:hidden"><HomeMobile active={active} setActive={setActive} {...data} /></div>
    </>
  );
}

function HomeDesktop({ active, setActive, env, readings, series, cfg, score }) {
  const wrapRef = useRef(null);
  const [tilt, setTilt] = useState('translate3d(0,0,0)');
  const ui = STATE_UI[env.state];
  const expr = STATE_EXPRESSION[env.state];
  const critical = env.state === 'critical';
  const level = env.levels[active] ?? 'none';
  const s = SENSORS[active];
  const status = LEVEL_STATUS[level];
  const bars = series[active].slice(-6).filter(Number.isFinite);
  const lo = Math.min(...bars); const hi = Math.max(...bars);
  const beam = SAT[active].beam;

  const onMove = (e) => {
    const r = wrapRef.current.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 14;
    const dy = ((e.clientY - r.top) / r.height - 0.5) * 14;
    setTilt(`translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`);
  };

  return (
    <main className="min-w-0 px-10 py-7 max-w-[1200px] mx-auto min-h-screen flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4 z-20">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-ink tracking-tight">Peekaboo’s Comfort Universe</h1>
            <DemoBadge className="text-xs px-3">Demo · 4 Sensors</DemoBadge>
          </div>
          <p className="text-sm text-muted font-semibold mt-0.5">Select any orbiting satellite to lock onto its orbital path and inspect telemetry</p>
        </div>
        <ScenarioSwitch />
      </header>

      <AlertBanner />

      <section className="grid grid-cols-12 gap-8 items-center flex-1 py-2">
        <div ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setTilt('translate3d(0,0,0)')}
          className="col-span-8 relative flex items-center justify-center min-h-[600px]">
          <div className="absolute w-[560px] h-[560px] rounded-full bg-lilac-soft/90 pointer-events-none" />
          <div className="universe-stage relative w-[520px] h-[520px] flex items-center justify-center" style={{ transform: tilt }}>
            <svg viewBox="0 0 520 520" className={`absolute inset-0 w-full h-full pointer-events-none ${env.state === 'offline' ? 'opacity-40 grayscale' : ''}`}>
              <circle cx="260" cy="260" r="246" fill="none" stroke="#6C3CE9" strokeWidth="2" strokeDasharray="8 10" opacity="0.28" className="ring-spin" />
              <circle cx="260" cy="260" r="192" fill="none" stroke="#B79EFF" strokeWidth="3" opacity="0.55" />
              <circle cx="260" cy="260" r="154" fill="none" stroke="#6C3CE9" strokeWidth="2.5" strokeDasharray="48 24 14 24" opacity="0.4" className="ring-spin-rev" />
              <line x1="260" y1="260" x2={beam[0]} y2={beam[1]} stroke="#6C3CE9" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" opacity="0.85" />
              <circle cx={beam[0]} cy={beam[1]} r="7" fill="#6C3CE9" />
            </svg>

            <div className="relative w-64 h-64 rounded-full bg-white border-[5px] border-electric/20 flex flex-col items-center justify-center text-center p-5 z-10 shadow-[0_20px_50px_rgba(108,60,233,0.18)]">
              {critical && <span className="absolute -inset-4 rounded-full bg-coral-soft halo-pulse-fast -z-10" aria-hidden="true" />}
              <svg viewBox="0 0 260 260" className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90 pointer-events-none">
                <circle cx="130" cy="130" r="122" fill="none" stroke="#ECE6FF" strokeWidth="10" />
                <circle cx="130" cy="130" r="122" fill="none" stroke={critical ? '#FF7B93' : '#6C3CE9'} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray="766" strokeDashoffset={Math.round(766 * (1 - (score ?? 0) / 100))} style={{ transition: 'stroke-dashoffset .5s' }} />
              </svg>
              <span className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wide mb-1.5 ${ui.badgeCls}`}>{ui.badge}</span>
              <div className="w-28 h-28 rounded-full bg-white p-1 mb-1.5">
                <Peekaboo expression={expr} className="w-full h-full" pad="p-0" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-bold text-electric tabular-nums leading-none">{score == null ? '--' : `${score}%`}</span>
                <span className="text-xs font-bold text-muted">Comfort</span>
              </div>
            </div>

            {Object.entries(SAT).map(([k, c]) => {
              const sel = active === k;
              const lv = env.levels[k];
              return (
                <button key={k} type="button" onClick={() => setActive(k)} aria-pressed={sel}
                  className={`${c.bob} absolute ${c.pos} ${c.shape} border-[3px] ${sel ? 'border-electric scale-105' : 'border-white hover:scale-105'} px-5 py-3 flex items-center gap-3 z-20 ${c.shadow} ${LEVEL_RING[lv] ?? ''} transition-all cursor-pointer`}>
                  <div className={`w-11 h-11 bg-white p-0.5 shrink-0 ${c.iconShape}`}>
                    <SensorIcon sensor={k} className="w-full h-full" shape={k === 'temp' ? 'rounded-xl' : 'rounded-full'} glyphSize="text-2xl" />
                  </div>
                  <div className="text-left">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${c.tag}`}>{c.tagText}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-2xl font-bold text-ink tabular-nums leading-none">{formatValue(k, readings?.[k])}</span>
                      {k === 'sound' && readings && <EqBars />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="col-span-4 flex flex-col gap-5 z-20">
          <div className="rounded-[34px] bg-white border-2 border-lilac p-6 flex flex-col gap-4 shadow-[0_14px_34px_rgba(108,60,233,0.08)]">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${s.chipCls}`}>{s.focus}</span>
              <span className={`rounded-full px-3 py-1 font-mono text-xs font-bold ${status.cls}`}>{status.text}</span>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold text-ink tabular-nums">{formatValue(active, readings?.[active])}</span>
                <span className="text-xs font-bold text-mint-ink">{formatLimit(active, cfg)}</span>
              </div>
              <p className="text-sm font-bold text-ink mt-3 leading-relaxed bg-lilac-soft/75 rounded-2xl p-3.5">
                {sensorQuote(active, level, readings?.[active])}
              </p>
            </div>
            <div className="pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted mb-2">
                <span>Last 6 Samples</span>
                <span className="font-mono text-electric">{s.hw}</span>
              </div>
              <div className="grid grid-cols-6 gap-2 items-end h-14 bg-canvas rounded-2xl p-2.5">
                {bars.map((v, i) => (
                  <div key={i} className={`${i === bars.length - 1 ? 'bg-electric' : 'bg-lilac'} rounded-full transition-all`}
                    style={{ height: `${hi === lo ? 70 : 40 + ((v - lo) / (hi - lo)) * 60}%` }} />
                ))}
              </div>
            </div>
          </div>
          <TipBubble />
        </aside>
      </section>
    </main>
  );
}

function HomeMobile({ active, setActive, env, readings, cfg, score }) {
  const ui = STATE_UI[env.state];
  const expr = STATE_EXPRESSION[env.state];
  const critical = env.state === 'critical';
  const s = SENSORS[active];
  const level = env.levels[active] ?? 'none';
  const beam = SAT[active].mbeam;
  return (
    <div className="max-w-md mx-auto flex flex-col pb-24">
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl text-ink block leading-none">WorkWell</h1>
            <DemoBadge />
          </div>
          <span className="text-[11px] font-bold text-electric">Radial Universe</span>
        </div>
        <span className={`rounded-full px-3.5 py-1 text-xs font-extrabold shadow-sm ${critical ? 'bg-coral text-white' : 'bg-electric text-white'}`}>
          {score == null ? ui.pill : `${score}% ${ui.label}`}
        </span>
      </header>
      <div className="px-5 py-1"><ScenarioSwitch compact /></div>
      <main className="px-4 pt-4 flex flex-col items-center gap-5">
        <div className="w-full"><AlertBanner compact /></div>
        <section className="relative w-[336px] h-[336px] flex items-center justify-center my-2">
          <div className="absolute inset-2 rounded-full bg-lilac-soft pointer-events-none" />
          <svg viewBox="0 0 336 336" className={`absolute inset-0 w-full h-full pointer-events-none ${env.state === 'offline' ? 'opacity-40' : ''}`}>
            <circle cx="168" cy="168" r="154" fill="none" stroke="#6C3CE9" strokeWidth="2" strokeDasharray="6 8" opacity="0.3" className="ring-spin" />
            <circle cx="168" cy="168" r="118" fill="none" stroke="#B79EFF" strokeWidth="2.5" opacity="0.55" />
            <line x1="168" y1="168" x2={beam[0]} y2={beam[1]} stroke="#6C3CE9" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="5 5" opacity="0.85" />
          </svg>
          <div className="relative w-40 h-40 rounded-full bg-white border-4 border-electric/20 flex flex-col items-center justify-center text-center p-3 z-10 shadow-[0_14px_34px_rgba(108,60,233,0.18)]">
            {critical && <span className="absolute -inset-3 rounded-full bg-coral-soft halo-pulse-fast -z-10" aria-hidden="true" />}
            <svg viewBox="0 0 176 176" className="absolute -inset-2 w-[calc(100%+16px)] h-[calc(100%+16px)] -rotate-90 pointer-events-none">
              <circle cx="88" cy="88" r="82" fill="none" stroke="#ECE6FF" strokeWidth="8" />
              <circle cx="88" cy="88" r="82" fill="none" stroke={critical ? '#FF7B93' : '#6C3CE9'} strokeWidth="8" strokeLinecap="round"
                strokeDasharray="515" strokeDashoffset={Math.round(515 * (1 - (score ?? 0) / 100))} style={{ transition: 'stroke-dashoffset .5s' }} />
            </svg>
            <Peekaboo expression={expr} className="w-20 h-20 mb-1" pad="p-1" />
            <span className="font-display text-2xl font-bold text-electric leading-none tabular-nums">{score == null ? '--' : `${score}%`}</span>
          </div>
          {Object.entries(SAT).map(([k, c]) => {
            const sel = active === k;
            return (
              <button key={k} type="button" onClick={() => setActive(k)} aria-pressed={sel} aria-label={SENSORS[k].label}
                className={`absolute ${c.mpos} ${c.mshape} border-2 ${sel ? 'border-electric scale-105' : 'border-white'} ${LEVEL_RING[env.levels[k]] ?? ''} py-1.5 flex items-center gap-1.5 z-20 shadow-md transition-transform`}>
                <SensorIcon sensor={k} className="w-7 h-7" glyphSize="text-base" />
                <span className="font-display text-sm font-bold text-ink tabular-nums">{formatValue(k, readings?.[k])}</span>
              </button>
            );
          })}
        </section>

        <section className="w-full rounded-[32px] bg-white border-2 border-lilac p-4 flex flex-col gap-2.5 shadow-[0_10px_28px_rgba(108,60,233,0.08)]">
          <div className="flex items-center justify-between">
            <span className={`rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${s.chipCls}`}>{s.focus}</span>
            <span className="font-mono text-[11px] font-semibold text-mint-ink">{formatLimit(active, cfg)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-3xl font-bold text-ink tabular-nums">{formatValue(active, readings?.[active])}</span>
            <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${LEVEL_STATUS[level].cls}`}>{LEVEL_STATUS[level].text}</span>
          </div>
          <p className="text-xs font-bold text-ink bg-lilac-soft/75 rounded-2xl p-3 leading-snug">{sensorQuote(active, level, readings?.[active])}</p>
        </section>
        <TipBubble variant="mobile" />
      </main>
    </div>
  );
}
