import { createPersistedStore } from './persisted.js';
import { DEFAULT_THRESHOLDS } from './environment.js';

export const DEFAULT_SETTINGS = Object.freeze({
  ...DEFAULT_THRESHOLDS,
  ledPulse: true,
  chime: false,
  nightDim: true,
});

// Same storage key the Stitch prototypes used.
export const settingsStore = createPersistedStore('workwell_settings_v1', DEFAULT_SETTINGS);
export const useSettings = settingsStore.useStore;
export const resetSettings = () => settingsStore.set({ ...DEFAULT_SETTINGS });
