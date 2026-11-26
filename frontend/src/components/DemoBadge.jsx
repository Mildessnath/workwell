import { useDataMode } from '../lib/dataMode.js';

/** Shown only in DEMO mode. */
export default function DemoBadge({ children = 'DEMO', className = '' }) {
  const { mode } = useDataMode();
  if (mode !== 'demo') return null;
  return (
    <span title="Simulated data — not connected to real sensors"
      className={`rounded-full bg-butter text-butter-ink px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}
