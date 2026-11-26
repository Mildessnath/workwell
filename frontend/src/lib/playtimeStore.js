import { createPersistedStore } from './persisted.js';

export const XP_PER_LEVEL = 200;

const DEFAULT_PLAYTIME = {
  xp: 140,
  level: 4,
  decos: { sprout: true, lamp: false, cushion: false, star: false },
  log: ['Shared Lavender Berry (+15 XP)', 'Petted Peekaboo (+10 XP)', 'Placed Lavender Sprout in orbit'],
};

export const playtimeStore = createPersistedStore('workwell_peekaboo_v1', DEFAULT_PLAYTIME);
export const usePlaytime = playtimeStore.useStore;

export function addXp(amount, entry) {
  playtimeStore.set((s) => {
    let xp = s.xp + amount;
    let level = s.level;
    while (xp >= XP_PER_LEVEL) { xp -= XP_PER_LEVEL; level += 1; }
    const log = entry ? [entry, ...s.log].slice(0, 5) : s.log;
    return { xp, level, log };
  });
}

export const DECORATIONS = [
  { key: 'sprout', name: 'Lavender Sprout', short: 'Sprout', glyph: 'potted_plant', on: 'bg-mint', ink: 'text-mint-ink', pos: 'top' },
  { key: 'lamp', name: 'Sunbeam Lamp', short: 'Lamp', glyph: 'wb_twilight', on: 'bg-butter', ink: 'text-butter-ink', pos: 'right' },
  { key: 'cushion', name: 'Cloud Cushion', short: 'Cushion', glyph: 'chair', on: 'bg-coral-soft', ink: 'text-coral-ink', pos: 'bottom' },
  { key: 'star', name: 'Star Garland', short: 'Stars', glyph: 'auto_awesome', on: 'bg-sky', ink: 'text-sky-ink', pos: 'left' },
];

export function toggleDeco(key) {
  playtimeStore.set((s) => {
    const on = !s.decos[key];
    const name = DECORATIONS.find((d) => d.key === key)?.name ?? key;
    return {
      decos: { ...s.decos, [key]: on },
      log: [`${on ? 'Placed' : 'Stored'} ${name} ${on ? 'in orbit' : 'away'}`, ...s.log].slice(0, 5),
    };
  });
}
