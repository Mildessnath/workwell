import { useState } from 'react';
import Peekaboo from '../components/Peekaboo.jsx';
import SensorIcon from '../components/SensorIcon.jsx';
import DemoBadge from '../components/DemoBadge.jsx';
import { smoothPath } from '../lib/environment.js';
import { useHistory } from '../lib/history.js';
import { useSensors } from '../lib/sensorSource.jsx';

const pct = (v) => (v == null ? '--' : `${v}%`);
const EMPTY_SLOT = { label: '—', score: '--', temp: '—', light: '—', hum: '—', sound: '—' };

const RINGS = [
  { key: 'temp', label: 'Temp', track: '#FFF4C2', color: '#F59E0B', chip: 'bg-butter/80', ink: 'text-butter-ink' },
  { key: 'light', label: 'Light', track: '#DCF4FF', color: '#0284C7', chip: 'bg-sky/75', ink: 'text-sky-ink' },
  { key: 'hum', label: 'Humid', track: '#D5FBE9', color: '#059669', chip: 'bg-mint/75', ink: 'text-mint-ink' },
  { key: 'sound', label: 'Sound', track: '#FFD6DE', color: '#E11D48', chip: 'bg-coral-soft', ink: 'text-coral-ink' },
];
const TILES = [
  { key: 'temp', label: 'Temp', bg: 'bg-butter/85', ink: 'text-butter-ink' },
  { key: 'light', label: 'Light', bg: 'bg-sky/85', ink: 'text-sky-ink' },
  { key: 'hum', label: 'Humid', bg: 'bg-mint/85', ink: 'text-mint-ink' },
  { key: 'sound', label: 'Sound', bg: 'bg-coral-soft', ink: 'text-coral-ink' },
];

function RingChart({ rings, radii, stroke, view, className }) {
  const c = view / 2;
  return (
    <svg viewBox={`0 0 ${view} ${view}`} className={`-rotate-90 ${className}`} role="img"
      aria-label={RINGS.map((r, i) => `${r.label} ${rings[i]}%`).join(', ')}>
      {RINGS.map((r, i) => {
        const len = 2 * Math.PI * radii[i];
        return (
          <g key={r.key}>
            <circle cx={c} cy={c} r={radii[i]} fill="none" stroke={r.track} strokeWidth={stroke} />
            <circle cx={c} cy={c} r={radii[i]} fill="none" stroke={r.color} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={Math.round(len)} strokeDashoffset={Math.round(len * (1 - (rings[i] ?? 0) / 100))} style={{ transition: 'stroke-dashoffset .5s' }} />
          </g>
        );
      })}
    </svg>
  );
}

function FlowChart({ slots, idx, pick, W, H, padX, padY, gradId, dotR, selR, strokeW, className }) {
  if (slots.length < 2) {
    return (
      <div className={`w-full rounded-3xl bg-canvas flex items-center justify-center text-center text-xs font-bold text-muted px-4 ${className}`}>
        {slots.length ? 'One time bucket so far — the curve appears after the next one.' : 'No stored readings for this range yet.'}
      </div>
    );
  }
  const pts = slots.map((sl, i) => [
    Math.round(padX + (i / (slots.length - 1)) * (W - padX * 2)),
    Math.round(H - padY - ((sl.score - 75) / 25) * (H - padY * 2)),
  ]);
  const d = smoothPath(pts);
  return (
    <svg viewBox={`0 0 ${W} ${H + 10}`} className={`w-full overflow-visible ${className}`} role="img" aria-label="Comfort flow curve">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6C3CE9" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#D5FBE9" stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path d={`${d} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke="#6C3CE9" strokeWidth={strokeW} strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === idx ? selR : dotR} fill={i === idx ? '#6C3CE9' : '#FFFFFF'} stroke="#6C3CE9" strokeWidth="3"
          style={{ cursor: 'pointer' }} onClick={() => pick(i)}>
          <title>{`${slots[i].label} · ${slots[i].score}%`}</title>
        </circle>
      ))}
    </svg>
  );
}

function RangeSwitch({ range, setRange, small }) {
  return (
    <div className={`inline-flex rounded-full bg-white border-2 border-lilac ${small ? 'p-1' : 'p-1.5'}`} role="group" aria-label="Time range">
      {['daily', 'weekly', 'monthly'].map((r) => (
        <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r}
          className={`rounded-full font-bold capitalize transition-colors ${small ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-1.5 text-xs'} ${range === r ? 'bg-electric text-white' : 'text-muted'}`}>
          {r}
        </button>
      ))}
    </div>
  );
}

export default function History() {
  const { mode, cfg } = useSensors();
  const [range, setRangeState] = useState('daily');
  const [idx, setIdx] = useState(null);
  const setRange = (r) => { setRangeState(r); setIdx(null); };
  const { dataset, error } = useHistory(range, mode, cfg);
  const d = error ? { ...dataset, insight: `Could not load history from Supabase: ${error}` } : dataset;
  const sel = d.slots.length ? Math.min(idx ?? d.defaultIdx, d.slots.length - 1) : -1;
  const slot = d.slots[sel] ?? EMPTY_SLOT;
  const props = { range, setRange, d, slot, idx: sel, pick: setIdx };
  return (
    <>
      <div className="hidden xl:block"><HistoryDesktop {...props} /></div>
      <div className="xl:hidden"><HistoryMobile {...props} /></div>
    </>
  );
}

function SlotButtons({ slots, idx, pick, small }) {
  return (
    <div className={`flex items-center justify-between ${small ? 'gap-1.5' : 'gap-2'}`}>
      {slots.map((sl, i) => (
        <button key={sl.label} type="button" onClick={() => pick(i)} aria-pressed={i === idx}
          className={`flex-1 rounded-full font-bold transition-colors ${small ? 'py-1 text-[11px]' : 'py-1.5 text-xs'} ${i === idx ? 'bg-electric text-white' : 'bg-lilac-soft text-muted hover:text-ink'}`}>
          {sl.label}
        </button>
      ))}
    </div>
  );
}

function HistoryDesktop({ range, setRange, d, slot, idx, pick }) {
  return (
    <main className="min-w-0 px-10 py-7 max-w-[1200px] mx-auto min-h-screen flex flex-col gap-7">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-ink tracking-tight">Orbital Comfort Story</h1>
            <DemoBadge className="text-xs px-3">Demo · Archive</DemoBadge>
          </div>
          <p className="text-sm text-muted font-semibold mt-0.5">Compare daily, weekly, and monthly balance across all four environmental rings</p>
        </div>
        <RangeSwitch range={range} setRange={setRange} />
      </header>
      <div className="grid grid-cols-12 gap-8 items-center">
        <section className="col-span-5 rounded-[40px] bg-white border-2 border-lilac p-6 flex flex-col items-center gap-5 shadow-[0_14px_34px_rgba(108,60,233,0.08)]">
          <div className="w-full flex items-center justify-between">
            <span className="font-display text-lg text-ink">Sensor Ring Balance</span>
            <span className="rounded-full bg-mint-soft text-mint-ink px-3 py-0.5 text-xs font-extrabold">{pct(d.avg)} Avg</span>
          </div>
          <div className="relative w-72 h-72 flex items-center justify-center">
            <RingChart rings={d.rings} radii={[124, 102, 80, 58]} stroke={14} view={280} className="w-full h-full" />
            <div className="absolute flex flex-col items-center text-center">
              <Peekaboo expression="happy" className="w-16 h-16 mb-1" />
              <span className="font-display text-2xl font-bold text-electric leading-none">{pct(d.avg)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 w-full text-xs font-bold">
            {RINGS.map((r, i) => (
              <div key={r.key} className={`rounded-full ${r.chip} px-3.5 py-2 flex items-center justify-between`}>
                <span className={r.ink}>{r.label}</span><span>{pct(d.rings[i])}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="col-span-7 flex flex-col gap-5">
          <div className="rounded-[40px] bg-white border-2 border-lilac p-6 flex flex-col gap-4 shadow-[0_14px_34px_rgba(108,60,233,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl text-ink">{d.title}</h2>
                <p className="text-xs font-semibold text-muted">Click any orbital node on the curve to inspect its readings</p>
              </div>
              <span className="rounded-full bg-butter text-butter-ink px-3.5 py-1 font-mono text-xs font-bold">{slot.label} · {slot.score}%</span>
            </div>
            <FlowChart slots={d.slots} idx={idx} pick={pick} W={540} H={155} padX={28} padY={20} gradId="histGrad" dotR={5} selR={7.5} strokeW={4} className="h-44" />
            <SlotButtons slots={d.slots} idx={idx} pick={pick} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {TILES.map((t) => (
              <div key={t.key} className={`rounded-[26px] ${t.bg} p-3.5 flex items-center gap-2.5`}>
                <SensorIcon sensor={t.key} className="w-9 h-9" />
                <div><span className={`text-[10px] font-bold block ${t.ink}`}>{t.label}</span><span className="font-display text-lg text-ink">{slot[t.key]}</span></div>
              </div>
            ))}
          </div>
          <div className="rounded-full bg-electric text-white px-5 py-3.5 flex items-center gap-3.5 shadow-[0_12px_26px_rgba(108,60,233,0.24)]">
            <Peekaboo expression="celebrate" className="w-10 h-10" />
            <p className="text-xs font-bold leading-snug">{d.insight}</p>
          </div>
        </section>
      </div>
    </main>
  );
}

function HistoryMobile({ range, setRange, d, slot, idx, pick }) {
  return (
    <div className="max-w-md mx-auto flex flex-col pb-24">
      <header className="px-5 pt-4 pb-2 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl text-ink leading-none">Comfort Story</h1>
            <DemoBadge />
          </div>
          <span className="text-[11px] font-semibold text-muted">Orbital balance over time</span>
        </div>
        <RangeSwitch range={range} setRange={setRange} small />
      </header>
      <main className="px-4 py-2 flex flex-col gap-4">
        <section className="rounded-[34px] bg-white border-2 border-lilac p-4 flex items-center gap-4 shadow-[0_10px_28px_rgba(108,60,233,0.08)]">
          <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
            <RingChart rings={d.rings} radii={[62, 50, 38, 26]} stroke={8} view={140} className="w-full h-full" />
            <span className="absolute font-display text-lg font-bold text-electric">{pct(d.avg)}</span>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-1.5 text-[11px] font-bold">
            {RINGS.map((r, i) => (
              <div key={r.key} className={`rounded-full ${r.chip} px-2.5 py-1 flex justify-between`}>
                <span className={r.ink}>{r.label}</span><span>{pct(d.rings[i])}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[34px] bg-white border-2 border-lilac p-4 flex flex-col gap-3 shadow-[0_10px_28px_rgba(108,60,233,0.08)]">
          <div className="flex items-center justify-between">
            <span className="font-display text-base text-ink">{d.title}</span>
            <span className="rounded-full bg-butter text-butter-ink px-2.5 py-0.5 font-mono text-[11px] font-bold">{slot.label} · {slot.score}%</span>
          </div>
          <FlowChart slots={d.slots} idx={idx} pick={pick} W={340} H={100} padX={20} padY={14} gradId="mHistGrad" dotR={3.5} selR={5.5} strokeW={3.5} className="h-24" />
          <SlotButtons slots={d.slots} idx={idx} pick={pick} small />
        </section>
        <section className="grid grid-cols-2 gap-2.5">
          {TILES.map((t) => (
            <div key={t.key} className={`rounded-[24px] ${t.bg} p-3 flex items-center gap-2.5`}>
              <SensorIcon sensor={t.key} className="w-9 h-9" />
              <div><span className={`text-[10px] font-bold block ${t.ink}`}>{t.label}</span><span className="font-display text-lg text-ink">{slot[t.key]}</span></div>
            </div>
          ))}
        </section>
        <section className="rounded-full bg-electric text-white px-4 py-3 flex items-center gap-3 shadow-md">
          <Peekaboo expression="celebrate" className="w-10 h-10" />
          <p className="text-xs font-bold leading-snug flex-1">{d.insight}</p>
        </section>
      </main>
    </div>
  );
}
