import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Peekaboo from './Peekaboo.jsx';
import Icon from './Icon.jsx';
import DataModeToggle from './DataModeToggle.jsx';
import { NAV_ITEMS } from './nav.js';
import { useSensors } from '../lib/sensorSource.jsx';
import { STATE_UI } from '../lib/environment.js';

export default function Sidebar() {
  const { pathname } = useLocation();
  const { env, ledPing } = useSensors();
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!ledPing) return undefined;
    setBlink(true);
    const t = setTimeout(() => setBlink(false), 450);
    return () => clearTimeout(t);
  }, [ledPing]);
  const ui = STATE_UI[env.state];

  let footer;
  if (pathname === '/playtime') {
    footer = (
      <div className="rounded-3xl bg-lilac-soft border-2 border-lilac px-3.5 py-2.5 flex items-center gap-2.5">
        <Icon name="favorite" fill className="text-electric text-base" />
        <span className="font-mono text-xs font-semibold text-electric">No-Decay Companion</span>
      </div>
    );
  } else if (pathname === '/history') {
    footer = (
      <div className="rounded-3xl bg-mint-soft border-2 border-mint px-3.5 py-2.5 flex items-center gap-2.5">
        <span className="w-3 h-3 rounded-full bg-mint-ink animate-pulse shrink-0" />
        <span className="font-mono text-xs font-semibold text-mint-ink">Archive Synced</span>
      </div>
    );
  } else {
    footer = (
      <div className={`rounded-3xl border-2 px-3.5 py-2.5 flex items-center gap-2.5 transition-colors ${ui.ledBox}`}>
        <span className={`w-3 h-3 rounded-full shrink-0 transition-transform ${ui.ledDot} ${blink ? 'scale-150' : 'animate-pulse'}`} />
        <span className="font-mono text-xs font-semibold">{ui.led}</span>
      </div>
    );
  }

  return (
    <aside className="hidden xl:flex w-56 shrink-0 sticky top-0 h-screen bg-white/80 backdrop-blur border-r-2 border-lilac/60 px-6 py-7 flex-col justify-between z-20">
      <div className="flex flex-col gap-9">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-electric p-0.5 shrink-0">
            <Peekaboo expression="happy" className="w-full h-full" alt="WorkWell" />
          </div>
          <div>
            <span className="font-display text-xl text-ink block leading-none">WorkWell</span>
            <span className="text-[11px] font-bold text-electric block mt-0.5">Radial Universe</span>
          </div>
        </div>
        <nav aria-label="Primary" className="flex flex-col gap-2">
          {NAV_ITEMS.map((n) => (
            <NavLink key={n.to} to={n.to} end
              className={({ isActive }) => isActive
                ? 'flex items-center gap-3 px-4 py-2.5 rounded-full bg-electric text-white font-bold text-sm shadow-sm'
                : 'flex items-center gap-3 px-4 py-2.5 rounded-full text-muted hover:bg-lilac-soft hover:text-ink text-sm font-bold transition-colors'}>
              {({ isActive }) => (<><Icon name={n.icon} fill={isActive} className="text-lg" /> {n.label}</>)}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex flex-col gap-3">
        <DataModeToggle />
        {footer}
      </div>
    </aside>
  );
}
