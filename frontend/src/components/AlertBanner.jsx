import Icon from './Icon.jsx';
import { useSensors } from '../lib/sensorSource.jsx';

/** Coral banner for warning/critical/offline states (hidden otherwise). */
export default function AlertBanner({ compact = false }) {
  const { env } = useSensors();
  let text = null;
  let tag = null;
  if (env.state === 'offline') { text = 'ESP32 disconnected from HiveMQ Cloud MQTT broker.'; tag = 'ESP32 Offline'; }
  else if (env.state === 'critical') { text = env.alerts[0]?.text ?? 'Critical threshold exceeded.'; tag = 'RGB LED · Coral Pulse'; }
  else if (env.state === 'warning') { text = env.alerts[0]?.text ?? 'Threshold exceeded.'; tag = 'RGB LED · Amber Pulse'; }
  if (env.state === 'nodata') {
    const msg = 'Connected — waiting for the first sensor reading.';
    return compact ? (
      <section role="status" className="w-full rounded-full border-2 px-4 py-2 flex items-center gap-2 bg-sky-soft border-sky text-sky-ink">
        <Icon name="hourglass_top" className="text-base" />
        <p className="text-xs font-extrabold flex-1">{msg}</p>
      </section>
    ) : (
      <section role="status" className="rounded-full border-2 px-5 py-3 flex items-center justify-between gap-4 bg-sky-soft border-sky text-sky-ink">
        <div className="flex items-center gap-3"><Icon name="hourglass_top" className="text-xl" /><span className="text-sm font-extrabold">{msg}</span></div>
        <span className="rounded-full bg-white px-3 py-0.5 font-mono text-xs font-bold shrink-0">No Data</span>
      </section>
    );
  }
  if (!text) return null;
  const critical = env.state === 'critical';
  const tone = env.state === 'offline'
    ? 'bg-slate-100 border-slate-300 text-slate-700'
    : critical ? 'bg-coral-soft border-coral text-coral-ink' : 'bg-orange border-butter text-orange-ink';
  const more = env.alerts.length > 1 ? ` (+${env.alerts.length - 1} more)` : '';
  if (compact) {
    return (
      <section role="alert" className={`w-full rounded-full border-2 px-4 py-2 flex items-center gap-2 ${tone}`}>
        <Icon name={env.state === 'offline' ? 'wifi_off' : 'warning'} className="text-base" />
        <p className="text-xs font-extrabold flex-1">{critical ? 'Critical: ' : ''}{text}{more}</p>
      </section>
    );
  }
  return (
    <section role="alert" className={`rounded-full border-2 px-5 py-3 flex items-center justify-between gap-4 ${tone} ${critical ? 'shadow-[0_0_0_6px_rgba(255,123,147,0.25)]' : ''}`}>
      <div className="flex items-center gap-3">
        <Icon name={env.state === 'offline' ? 'wifi_off' : 'warning'} className="text-xl" />
        <span className="text-sm font-extrabold">{critical ? 'Critical: ' : ''}{text}{more}</span>
      </div>
      <span className="rounded-full bg-white px-3 py-0.5 font-mono text-xs font-bold shrink-0">{tag}</span>
    </section>
  );
}
