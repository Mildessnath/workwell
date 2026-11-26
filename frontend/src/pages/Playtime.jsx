import { useEffect, useRef, useState } from 'react';
import Peekaboo from '../components/Peekaboo.jsx';
import Icon from '../components/Icon.jsx';
import DemoBadge from '../components/DemoBadge.jsx';
import { TREATS } from '../assets/assetMap.js';
import { DECORATIONS, XP_PER_LEVEL, addXp, toggleDeco, usePlaytime } from '../lib/playtimeStore.js';

const GAME_SECONDS = 15;

const MOODS = [
  { key: 'happy', label: 'Happy', cls: 'bg-butter text-butter-ink', quote: '“Feeling bright and cozy!”' },
  { key: 'curious', label: 'Curious', cls: 'bg-mint-soft text-mint-ink', quote: '“Ooh, what are we exploring?”' },
  { key: 'sleepy', label: 'Sleepy', cls: 'bg-lilac-soft text-electric', quote: '“Taking a gentle afternoon rest…”' },
  { key: 'encourage', label: 'Encourage', cls: 'bg-orange text-orange-ink', quote: '“You’ve got this — one step at a time!”' },
  { key: 'celebrate', label: 'Celebrate', cls: 'bg-coral-soft text-coral-ink', quote: '“Woohoo! Milestone unlocked!”' },
  { key: 'neutral', label: 'Neutral', cls: 'bg-canvas border border-lilac text-muted', quote: '“Just hanging out quietly with you.”' },
];
const MOOD_CLS = Object.fromEntries(MOODS.map((m) => [m.key, m.cls]));

const DECO_POS = {
  desktop: { top: '-top-3 left-1/2 -translate-x-1/2', right: 'top-1/2 -right-8 -translate-y-1/2', bottom: '-bottom-3 left-1/2 -translate-x-1/2', left: 'top-1/2 -left-8 -translate-y-1/2' },
  mobile: { top: '-top-2 left-1/2 -translate-x-1/2', right: 'top-1/2 -right-2 -translate-y-1/2', bottom: '-bottom-2 left-1/2 -translate-x-1/2', left: 'top-1/2 -left-2 -translate-y-1/2' },
};

const INITIAL = { expression: 'happy', label: 'Happy', speech: '“Hey friend! Tap me for a cozy high-five.”' };

export default function Playtime() {
  const pt = usePlaytime();
  const [companion, setCompanion] = useState(INITIAL);
  const [hearts, setHearts] = useState([]);
  const [bounce, setBounce] = useState(0);
  const [game, setGame] = useState({ running: false, secs: GAME_SECONDS, score: 0, angle: 0, roundEnd: null });
  const scoreRef = useRef(0);

  const pet = () => {
    const id = Date.now() + Math.random();
    setHearts((h) => [...h, { id, left: 35 + Math.random() * 30 }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 900);
    setBounce((b) => b + 1);
    setCompanion({ expression: 'happy', label: 'Happy', speech: '“Hehe, that feels so cozy! +10 Affection XP”' });
    addXp(10, 'Petted Peekaboo (+10 XP)');
  };

  const feed = (t) => {
    // Snack reward -> Celebrate (guide §3). The treat's own visual is its glyph tile.
    setCompanion({ expression: 'celebrate', label: 'Celebrate', speech: t.quote });
    addXp(15, `Shared ${t.name} (+15 XP)`);
  };

  const previewMood = (m) => setCompanion({ expression: m.key, label: m.label, speech: m.quote });

  const startGame = () => {
    if (game.running) return;
    scoreRef.current = 0;
    setGame({ running: true, secs: GAME_SECONDS, score: 0, angle: Math.random() * Math.PI * 2, roundEnd: null });
    setCompanion({ expression: 'curious', label: 'Curious', speech: '“Catch the stars around my orbit!”' });
  };

  const catchStar = () => {
    scoreRef.current += 1;
    setGame((g) => ({ ...g, score: scoreRef.current, angle: Math.random() * Math.PI * 2 }));
  };

  useEffect(() => {
    if (!game.running) return undefined;
    const id = setInterval(() => {
      setGame((g) => {
        if (g.secs > 1) return { ...g, secs: g.secs - 1 };
        return { ...g, running: false, secs: GAME_SECONDS, roundEnd: { score: scoreRef.current, at: Date.now() } };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [game.running]);

  // Award once when a round ends: mini-game achievement -> Celebrate.
  useEffect(() => {
    if (!game.roundEnd) return;
    const { score } = game.roundEnd;
    const earned = Math.max(10, score * 5);
    setCompanion({ expression: 'celebrate', label: 'Celebrate', speech: `“Caught ${score} stars together! +${earned} XP”` });
    addXp(earned, `Starlight Tap: ${score} stars (+${earned} XP)`);
  }, [game.roundEnd]);

  const props = { pt, companion, hearts, bounce, game, pet, feed, previewMood, startGame, catchStar };
  return (
    <>
      <div className="hidden xl:block"><PlayDesktop {...props} /></div>
      <div className="xl:hidden"><PlayMobile {...props} /></div>
    </>
  );
}

function Hearts({ hearts, big }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible" aria-hidden="true">
      {hearts.map((h) => (
        <span key={h.id} className={`material-symbols-outlined icon-fill text-coral absolute heart-pop ${big ? 'text-2xl' : 'text-xl'}`}
          style={{ left: `${h.left}%`, top: '26%' }}>favorite</span>
      ))}
    </div>
  );
}

function StarTarget({ game, center, radius, onCatch }) {
  if (!game.running) return null;
  const x = center + Math.cos(game.angle) * radius - 22;
  const y = center + Math.sin(game.angle) * radius - 22;
  return (
    <button type="button" onClick={onCatch} aria-label="Catch star"
      className="absolute z-30 w-11 h-11 rounded-full bg-butter border-2 border-electric flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      style={{ left: x, top: y }}>
      <Icon name="star" fill className="text-butter-ink text-2xl" />
    </button>
  );
}

function Decos({ decos, variant }) {
  return DECORATIONS.filter((d) => decos[d.key]).map((d) => (
    variant === 'desktop' ? (
      <div key={d.key} className={`absolute ${DECO_POS.desktop[d.pos]} ${d.on} border-2 border-white rounded-full px-4 py-1.5 flex items-center gap-2 z-20 shadow-md`}>
        <Icon name={d.glyph} className={`${d.ink} text-lg`} />
        <span className={`text-xs font-extrabold ${d.ink}`}>{d.name}</span>
      </div>
    ) : (
      <span key={d.key} className={`absolute ${DECO_POS.mobile[d.pos]} ${d.on} border-2 border-white rounded-full px-3 py-0.5 text-[10px] font-extrabold ${d.ink} z-20 shadow`}>{d.short}</span>
    )
  ));
}

function GamePanel({ game, startGame, compact }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <span className={`font-display text-ink block ${compact ? 'text-base' : 'text-lg'}`}>Starlight Tap</span>
          <span className="text-xs text-muted font-semibold">Tap floating stars around Peekaboo’s orbit for {GAME_SECONDS} seconds</span>
        </div>
        <span className="rounded-full bg-butter text-butter-ink px-3 py-1 font-mono text-xs font-bold tabular-nums" aria-live="polite">{game.secs}s</span>
      </div>
      <div className={`rounded-[28px] bg-lilac-soft/75 flex items-center justify-between ${compact ? 'p-4' : 'p-5'}`}>
        <div>
          <span className="text-xs font-bold text-muted block">Session Stars</span>
          <span className="font-display text-3xl text-electric tabular-nums">{game.score}</span>
        </div>
        <button type="button" onClick={startGame} disabled={game.running}
          className="rounded-full bg-electric text-white px-6 py-2.5 text-sm font-bold shadow-md hover:opacity-95 disabled:opacity-60">
          {game.running ? 'Playing…' : `Start ${GAME_SECONDS}s Round`}
        </button>
      </div>
    </div>
  );
}

function PlayDesktop({ pt, companion, hearts, bounce, game, pet, feed, previewMood, startGame, catchStar }) {
  const [tab, setTab] = useState('feed');
  const TABS = [['feed', 'Feed'], ['play', 'Play Game'], ['habitat', 'Habitat'], ['log', 'History']];
  return (
    <main className="min-w-0 px-10 py-7 max-w-[1200px] mx-auto min-h-screen flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-ink tracking-tight">Take Care of Peekaboo</h1>
            <span className="rounded-full bg-mint-soft text-mint-ink px-3 py-0.5 font-mono text-xs font-bold">Relaxed · Optional</span>
          </div>
          <p className="text-sm text-muted font-semibold mt-0.5">Peekaboo never loses happiness while you’re away — drop in anytime to pet, feed, or play</p>
        </div>
        <div className="rounded-full bg-white border-2 border-lilac px-5 py-2.5 flex items-center gap-4 shadow-sm">
          <div>
            <span className="font-display text-sm text-electric block leading-none">Lv. {pt.level} · Cozy Sprout</span>
            <span className="font-mono text-[11px] text-muted">{pt.xp} / {XP_PER_LEVEL} Affection XP</span>
          </div>
          <div className="w-32 h-3 rounded-full bg-lilac-soft overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={XP_PER_LEVEL} aria-valuenow={pt.xp}>
            <div className="h-full rounded-full bg-electric transition-all duration-300" style={{ width: `${Math.min(100, Math.round((pt.xp / XP_PER_LEVEL) * 100))}%` }} />
          </div>
        </div>
      </header>
      <div className="grid grid-cols-12 gap-8 items-center flex-1">
        <section className="col-span-6 relative flex flex-col items-center justify-center min-h-[540px]">
          <div className="absolute w-[460px] h-[460px] rounded-full bg-lilac-soft/90 pointer-events-none" />
          <div className="relative w-[430px] h-[430px] flex items-center justify-center">
            <svg viewBox="0 0 430 430" className="absolute inset-0 w-full h-full pointer-events-none">
              <circle cx="215" cy="215" r="202" fill="none" stroke="#6C3CE9" strokeWidth="2" strokeDasharray="7 9" opacity="0.28" className="ring-spin" />
              <circle cx="215" cy="215" r="150" fill="none" stroke="#B79EFF" strokeWidth="2.5" opacity="0.55" />
            </svg>
            <Decos decos={pt.decos} variant="desktop" />
            <StarTarget game={game} center={215} radius={165} onCatch={catchStar} />
            <button key={bounce} type="button" onClick={pet} aria-label="Pet Peekaboo"
              className={`relative w-64 h-64 rounded-full bg-white border-[5px] border-electric/25 flex flex-col items-center justify-center text-center p-5 z-10 shadow-[0_20px_50px_rgba(108,60,233,0.18)] hover:scale-[1.03] active:scale-95 transition-transform cursor-pointer ${bounce ? 'pet-bounce' : ''}`}>
              <Hearts hearts={hearts} big />
              <span className={`rounded-full px-3 py-0.5 text-[11px] font-extrabold uppercase mb-2 ${MOOD_CLS[companion.expression]}`}>{companion.label} · Tap to Pet</span>
              <Peekaboo expression={companion.expression} className="w-32 h-32 mb-2" pad="p-1" />
              <p className="text-xs font-bold text-muted leading-snug px-6 max-w-[15rem]" aria-live="polite">{companion.speech}</p>
            </button>
          </div>
        </section>
        <section className="col-span-6 rounded-[38px] bg-white border-2 border-lilac p-6 flex flex-col gap-5 shadow-[0_14px_34px_rgba(108,60,233,0.08)]">
          <div className="grid grid-cols-4 gap-1.5 bg-lilac-soft/75 p-1.5 rounded-full" role="tablist">
            {TABS.map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`rounded-full py-2 text-xs font-bold transition-colors ${tab === k ? 'bg-electric text-white' : 'text-muted hover:text-ink'}`}>{l}</button>
            ))}
          </div>
          {tab === 'feed' && (
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-ink">Snack Pantry</span>
                <span className="font-mono text-xs text-muted">Tap a treat to share (+15 XP)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {TREATS.map((t) => (
                  <button key={t.key} type="button" onClick={() => feed(t)} className={`rounded-[26px] ${t.tile} p-4 text-left flex items-center gap-3 transition-colors`}>
                    <span className={`w-11 h-11 rounded-2xl bg-white flex items-center justify-center ${t.ink}`}><Icon name={t.glyph} className="text-2xl" /></span>
                    <div><span className="font-display text-base text-ink block">{t.name}</span><span className={`text-[11px] font-bold ${t.ink}`}>+15 Affection XP</span></div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {tab === 'play' && <GamePanel game={game} startGame={startGame} />}
          {tab === 'habitat' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-ink">Habitat Decorations</span>
                <span className="font-mono text-xs text-muted">Toggle items in orbit</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {DECORATIONS.map((d) => {
                  const on = pt.decos[d.key];
                  return (
                    <button key={d.key} type="button" onClick={() => toggleDeco(d.key)} aria-pressed={on}
                      className={`rounded-[24px] border-2 p-3.5 text-left flex items-center justify-between ${on ? 'bg-mint-soft border-mint' : 'bg-canvas border-lilac'}`}>
                      <span className={`text-xs font-extrabold flex items-center gap-2 ${on ? 'text-mint-ink' : 'text-ink'}`}><Icon name={d.glyph} className="text-base" />{d.name}</span>
                      <span className={`text-[11px] font-bold ${on ? 'text-mint-ink' : 'text-muted'}`}>{on ? 'Equipped' : 'Place'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {tab === 'log' && (
            <div className="flex flex-col gap-3">
              <span className="font-display text-lg text-ink">Recent Moments</span>
              <ul className="flex flex-col gap-2 text-xs font-semibold text-ink">
                {pt.log.map((item, i) => (
                  <li key={`${i}-${item}`} className="rounded-2xl bg-canvas px-3.5 py-2.5 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-electric" />{item}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="pt-2 border-t border-lilac-soft flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-muted">Mood preview:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {MOODS.map((m) => (
                <button key={m.key} type="button" onClick={() => previewMood(m)} aria-pressed={companion.expression === m.key}
                  className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold ${m.cls} ${companion.expression === m.key ? 'ring-2 ring-electric' : ''}`}>{m.label}</button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function PlayMobile({ pt, companion, hearts, bounce, game, pet, feed, startGame, catchStar }) {
  const [tab, setTab] = useState('feed');
  const TABS = [['feed', 'Feed'], ['play', 'Play'], ['habitat', 'Habitat'], ['log', 'History']];
  return (
    <div className="max-w-md mx-auto flex flex-col pb-24">
      <header className="px-5 pt-4 pb-2 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl text-ink leading-none">Peekaboo Playtime</h1>
            <DemoBadge />
          </div>
          <span className="text-[11px] font-semibold text-muted">Relaxed companion · No decay</span>
        </div>
        <div className="rounded-full bg-white border-2 border-lilac px-3 py-1 flex items-center gap-2">
          <span className="font-display text-xs text-electric">Lv. {pt.level}</span>
          <span className="font-mono text-[10px] text-muted">{pt.xp}/{XP_PER_LEVEL}</span>
        </div>
      </header>
      <main className="px-4 py-2 flex flex-col items-center gap-4">
        <section className="relative w-[300px] h-[300px] flex items-center justify-center my-1">
          <div className="absolute inset-2 rounded-full bg-lilac-soft pointer-events-none" />
          <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full pointer-events-none">
            <circle cx="150" cy="150" r="136" fill="none" stroke="#6C3CE9" strokeWidth="2" strokeDasharray="6 8" opacity="0.28" className="ring-spin" />
            <circle cx="150" cy="150" r="104" fill="none" stroke="#B79EFF" strokeWidth="2.5" opacity="0.55" />
          </svg>
          <Decos decos={pt.decos} variant="mobile" />
          <StarTarget game={game} center={150} radius={118} onCatch={catchStar} />
          <button key={bounce} type="button" onClick={pet} aria-label="Pet Peekaboo"
            className={`relative w-40 h-40 rounded-full bg-white border-4 border-electric/25 flex flex-col items-center justify-center text-center p-3 z-10 shadow-lg active:scale-95 transition-transform ${bounce ? 'pet-bounce' : ''}`}>
            <Hearts hearts={hearts} />
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold mb-1 ${MOOD_CLS[companion.expression]}`}>Tap to Pet</span>
            <Peekaboo expression={companion.expression} className="w-20 h-20" pad="p-1" />
          </button>
        </section>
        <p className="w-full rounded-full bg-electric text-white px-4 py-2.5 text-center text-xs font-bold shadow-md" aria-live="polite">{companion.speech}</p>
        <section className="w-full rounded-[32px] bg-white border-2 border-lilac p-4 flex flex-col gap-3 shadow-[0_10px_28px_rgba(108,60,233,0.08)]">
          <div className="grid grid-cols-4 gap-1 bg-lilac-soft/75 p-1 rounded-full" role="tablist">
            {TABS.map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={`rounded-full py-1.5 text-[11px] font-bold ${tab === k ? 'bg-electric text-white' : 'text-muted'}`}>{l}</button>
            ))}
          </div>
          {tab === 'feed' && (
            <div className="grid grid-cols-2 gap-2.5">
              {TREATS.map((t) => (
                <button key={t.key} type="button" onClick={() => feed(t)} className={`rounded-[22px] ${t.tile} p-3 text-left flex items-center gap-2`}>
                  <Icon name={t.glyph} className={`${t.ink} text-xl`} />
                  <div><span className="font-display text-xs text-ink block">{t.short}</span><span className={`text-[10px] font-bold ${t.ink}`}>+15 XP</span></div>
                </button>
              ))}
            </div>
          )}
          {tab === 'play' && <GamePanel game={game} startGame={startGame} compact />}
          {tab === 'habitat' && (
            <div className="grid grid-cols-2 gap-2.5">
              {DECORATIONS.map((d) => {
                const on = pt.decos[d.key];
                return (
                  <button key={d.key} type="button" onClick={() => toggleDeco(d.key)} aria-pressed={on}
                    className={`rounded-[20px] p-3 text-xs font-extrabold flex items-center justify-between gap-1 border-2 ${on ? `${d.on} border-white ${d.ink}` : 'bg-canvas border-lilac text-ink'}`}>
                    <span className="flex items-center gap-1.5"><Icon name={d.glyph} className="text-base" />{d.short}</span>
                    <span className="text-[10px]">{on ? 'On' : 'Off'}</span>
                  </button>
                );
              })}
            </div>
          )}
          {tab === 'log' && (
            <ul className="flex flex-col gap-1.5 text-xs font-semibold text-ink">
              {pt.log.map((item, i) => <li key={`${i}-${item}`} className="rounded-xl bg-canvas px-3 py-2">{item}</li>)}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
