import { useSyncExternalStore } from 'react';

/** Tiny localStorage-backed store shared across pages. Survives blocked storage. */
export function createPersistedStore(key, defaults) {
  let state = defaults;
  try {
    const raw = localStorage.getItem(key);
    if (raw) state = { ...defaults, ...JSON.parse(raw) };
  } catch { /* storage unavailable: keep defaults */ }
  const listeners = new Set();
  const get = () => state;
  const set = (patch) => {
    state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* ignore */ }
    listeners.forEach((l) => l());
  };
  const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
  const useStore = () => useSyncExternalStore(subscribe, get, get);
  return { get, set, subscribe, useStore };
}
