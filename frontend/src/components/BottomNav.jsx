import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import { NAV_ITEMS } from './nav.js';

export default function BottomNav() {
  return (
    <nav aria-label="Primary" className="xl:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t-2 border-lilac/60 px-2 py-2 z-40">
      <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
        {NAV_ITEMS.map((n) => (
          <NavLink key={n.to} to={n.to} end
            className={({ isActive }) => `flex flex-col items-center py-1 rounded-full ${isActive ? 'bg-electric text-white' : 'text-muted'}`}>
            {({ isActive }) => (
              <>
                <Icon name={n.icon} fill={isActive} className="text-lg" />
                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-semibold'}`}>{n.short}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
