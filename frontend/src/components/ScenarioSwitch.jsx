import { SCENARIOS, useSensors } from '../lib/sensorSource.jsx';

function LiveChip({ compact }) {
  const { source } = useSensors();
  const time = source.lastAt ? new Date(source.lastAt).toLocaleTimeString([], { hour12: false }) : null;
  const text = source.error
    ? `Supabase: ${source.error}`
    : !source.loaded ? 'Connecting to Supabase…'
      : time ? `Live · last reading ${time}` : 'Live · waiting for first reading';
  const tone = source.error ? 'bg-coral-soft text-coral-ink border-coral' : 'bg-mint-soft text-mint-ink border-mint';
  return (
    <span role="status" title={text}
      className={`inline-flex items-center gap-2 rounded-full border-2 font-mono font-bold max-w-full truncate ${tone} ${compact ? 'px-3 py-1 text-[10px]' : 'px-4 py-2 text-xs'}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${source.error ? 'bg-coral-ink' : 'bg-mint-ink animate-pulse'}`} />
      <span className="truncate">{text}</span>
    </span>
  );
}

/** DEMO: scenario switch that drives the simulated stream. REAL: live source status chip. */
export default function ScenarioSwitch({ compact = false }) {
  const { scenario, setScenario, isDemo } = useSensors();
  if (!isDemo) return <LiveChip compact={compact} />;
  if (compact) {
    return (
      <div className="flex flex-col gap-1.5" role="group" aria-labelledby="sim-label-m">
        <span id="sim-label-m" className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Simulate a state · Demo</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {SCENARIOS.map((s) => (
            <button key={s.key} type="button" onClick={() => setScenario(s.key)} aria-pressed={scenario === s.key}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${scenario === s.key ? 'bg-electric text-white' : 'bg-white text-muted'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 bg-white border-2 border-lilac p-1.5 rounded-full" role="group" aria-labelledby="sim-label-d">
      <span id="sim-label-d" className="pl-2.5 pr-1 text-[10px] font-extrabold uppercase tracking-wider text-muted" title="Demo only: drive the simulated sensors through each state">Simulate</span>
      {SCENARIOS.map((s) => (
        <button key={s.key} type="button" onClick={() => setScenario(s.key)} aria-pressed={scenario === s.key}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${scenario === s.key ? 'bg-electric text-white' : 'text-muted hover:text-ink'}`}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
