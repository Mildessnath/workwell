import Peekaboo from './Peekaboo.jsx';
import Icon from './Icon.jsx';
import { useSensors } from '../lib/sensorSource.jsx';
import { tipFor } from '../lib/environment.js';
import { STATE_EXPRESSION } from '../assets/assetMap.js';

/** Dynamic "Peekaboo's Note": expression and text follow the current state. */
export default function TipBubble({ variant = 'desktop', title = 'Peekaboo’s Note' }) {
  const { env, readings, cfg } = useSensors();
  const critical = env.state === 'critical';
  const text = tipFor(env, readings, cfg);
  const expr = STATE_EXPRESSION[env.state];
  const ring = critical ? 'ring-4 ring-coral ring-offset-2 ring-offset-canvas' : '';
  if (variant === 'mobile') {
    return (
      <section aria-live="polite" className={`w-full rounded-full bg-electric text-white px-4 py-3 flex items-center gap-3 shadow-md ${ring}`}>
        <Peekaboo expression={expr} className="w-10 h-10" />
        <p className="text-xs font-bold leading-snug flex-1">{text}</p>
        {critical && <span className="rounded-full bg-coral-soft text-coral-ink px-2 py-0.5 text-[10px] font-extrabold shrink-0">Alert</span>}
      </section>
    );
  }
  return (
    <div aria-live="polite" className={`rounded-[30px] bg-electric text-white p-5 flex items-center gap-4 shadow-[0_14px_30px_rgba(108,60,233,0.28)] ${ring}`}>
      <Peekaboo expression={expr} className="w-12 h-12" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-butter block">{title}</span>
          {critical && (
            <span className="inline-flex items-center gap-1 rounded-full bg-coral-soft text-coral-ink px-2 py-0.5 text-[10px] font-extrabold">
              <Icon name="warning" className="text-xs" /> Alert
            </span>
          )}
        </div>
        <p className="text-xs font-bold leading-snug mt-0.5">{text}</p>
      </div>
    </div>
  );
}
