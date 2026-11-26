import { PEEKABOO } from '../assets/assetMap.js';

/**
 * Official Peekaboo artwork in its white circular frame.
 * Always object-contain on white — never cover/crop/stretch/recolor.
 */
export default function Peekaboo({ expression = 'happy', className = 'w-12 h-12', pad = 'p-0.5', alt }) {
  const a = PEEKABOO[expression] ?? PEEKABOO.neutral;
  return (
    <img
      src={a.src}
      alt={alt ?? a.alt}
      width={1080}
      height={1080}
      draggable={false}
      className={`rounded-full object-contain bg-white shrink-0 select-none ${pad} ${className}`}
    />
  );
}
