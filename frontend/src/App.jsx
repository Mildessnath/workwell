import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import BottomNav from './components/BottomNav.jsx';
import { SensorProvider } from './lib/sensorSource.jsx';
import Home from './pages/Home.jsx';
import Live from './pages/Live.jsx';
import Playtime from './pages/Playtime.jsx';
import History from './pages/History.jsx';
import Settings from './pages/Settings.jsx';

const TITLES = { '/': 'Home Orbit', '/live': 'Live Stream', '/playtime': 'Peekaboo Playtime', '/history': 'History', '/settings': 'Settings' };

function TitleSync() {
  const { pathname } = useLocation();
  useEffect(() => { document.title = `${TITLES[pathname] ?? 'Home Orbit'} — WorkWell`; }, [pathname]);
  return null;
}

export default function App() {
  return (
    <SensorProvider>
      <BrowserRouter>
        <TitleSync />
        <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-electric focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold">
          Skip to content
        </a>
        <div className="min-h-screen xl:flex">
          <Sidebar />
          <div id="content" tabIndex={-1} className="flex-1 min-w-0 outline-none">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/live" element={<Live />} />
              <Route path="/playtime" element={<Playtime />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
        <BottomNav />
      </BrowserRouter>
    </SensorProvider>
  );
}
