import { createPersistedStore } from './persisted.js';
import { isSupabaseConfigured } from './supabaseClient.js';

const envDefault = import.meta.env.VITE_DEFAULT_DATA_MODE === 'real' ? 'real' : 'demo';

export const dataModeStore = createPersistedStore('workwell_data_mode_v1', { mode: envDefault });

/** Effective mode: REAL only when Supabase is configured; otherwise always DEMO. */
export function useDataMode() {
  const { mode } = dataModeStore.useStore();
  const effective = mode === 'real' && isSupabaseConfigured ? 'real' : 'demo';
  return {
    mode: effective,
    requested: mode,
    realAvailable: isSupabaseConfigured,
    setMode: (m) => dataModeStore.set({ mode: m === 'real' ? 'real' : 'demo' }),
  };
}
