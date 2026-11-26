import { MISC_ICONS, SENSOR_ICONS } from '../assets/assetMap.js';

/**
 * Sensor / gear illustration. Uses the official file when `src` is set in
 * assetMap.js; otherwise renders the documented placeholder glyph.
 */
export default function SensorIcon({ sensor, misc, className = 'w-9 h-9', shape = 'rounded-full', glyphSize = 'text-xl' }) {
  const a = misc ? MISC_ICONS[misc] : SENSOR_ICONS[sensor];
  if (a.src) {
    return <img src={a.src} alt={a.label} className={`${shape} object-cover bg-white shrink-0 ${className}`} />;
  }
  return (
    <span
      role="img"
      aria-label={a.label}
      data-placeholder-for={a.expectedFile ?? a.key}
      className={`${shape} bg-white shrink-0 inline-flex items-center justify-center ${className}`}
    >
      <span className={`material-symbols-outlined icon-fill ${a.glyphColor} ${glyphSize}`}>{a.fallbackGlyph}</span>
    </span>
  );
}
