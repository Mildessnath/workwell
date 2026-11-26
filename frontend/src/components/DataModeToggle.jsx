import { useDataMode } from '../lib/dataMode.js';

/** DEMO / REAL data-source switch. REAL is disabled until Supabase env vars are set. */
export default function DataModeToggle({ className = '' }) {
  const { mode, setMode, realAvailable } = useDataMode();
  const btn = (key, label) => {
    const on = mode === key;
    const disabled = key === 'real' && !realAvailable;
    return (
      <button type="button" onClick={() => setMode(key)} disabled={disabled} aria-pressed={on}
        title={disabled ? 'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local to enable REAL mode' : undefined}
        className={`flex-1 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide transition-colors
          ${on ? (key === 'demo' ? 'bg-butter text-butter-ink' : 'bg-mint text-mint-ink') : 'text-muted hover:text-ink'}
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-muted`}>
        {label}
      </button>
    );
  };
  return (
    <div role="group" aria-label="Data source" className={`flex items-center gap-1 rounded-full bg-white border-2 border-lilac p-1 ${className}`}>
      {btn('demo', 'Demo')}
      {btn('real', 'Real')}
    </div>
  );
}
