import { create } from "zustand";
import { persist } from "zustand/middleware";
import neighbours from "../data/neighbours.json";
import type { GameMode, ISO3 } from "../game/modes";
import { poolForMode } from "../game/modes";
import { pickReachablePair } from "../game/reachability";
import type { Difficulty } from "../game/difficulty";
import { paramsForDifficulty } from "../game/difficulty";

type GameState = {
  // core
  start: ISO3 | null;
  target: ISO3 | null;
  current: ISO3 | null;
  visited: Set<ISO3>;
  moves: number;
  hintsLeft: number;

  // UI helpers
  focusIso: ISO3 | null;
  hintTarget: ISO3 | null;

  // modes/timer
  mode: GameMode;
  timeLeft: number | null;
  _timer?: number | null;

  // difficulty
  difficulty: Difficulty;

  // actions
  setMode: (mode: GameMode) => void;
  setDifficulty: (d: Difficulty) => void;
  setStartTarget: (start: ISO3, target: ISO3) => void;
  randomiseReachableRoute: () => void;
  moveTo: (iso3: ISO3) => void;
  setFocus: (iso3: ISO3 | null) => void;
  setHintTarget: (iso3: ISO3 | null) => void;
  useHint: () => void;
  startTimerIfNeeded: () => void;
  stopTimer: () => void;
  reset: () => void;
};

const NB = neighbours as Record<string, readonly string[]>;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      start: null,
      target: null,
      current: null,
      visited: new Set<ISO3>(),
      moves: 0,
      hintsLeft: 3,

      focusIso: null,
      hintTarget: null,

      mode: "World",
      timeLeft: null,
      _timer: null,

      difficulty: "Normal",

      setMode: (mode) => {
        const wasTT = get().mode === "Time Trial";
        set({ mode });
        if (mode !== "Time Trial" && wasTT) {
          get().stopTimer();
          set({ timeLeft: null });
        }
      },

      setDifficulty: (d) => set({ difficulty: d }),

      setStartTarget: (start, target) =>
        set(() => ({
          start,
          target,
          current: start,
          visited: new Set([start]),
          moves: 0,
          hintsLeft: 3,
          focusIso: start,
          hintTarget: null,
          timeLeft: get().mode === "Time Trial" ? 60 : null,
        })),

      randomiseReachableRoute: () => {
        const pool = poolForMode(get().mode) as readonly ISO3[];
        const { minHops, maxHops } = paramsForDifficulty(get().difficulty);
        const pick = pickReachablePair(NB, pool, { minHops, maxHops });
        if (pick) {
          get().setStartTarget(pick.start as ISO3, pick.target as ISO3);
        } else {
          const s = pool[0] as ISO3;
          get().setStartTarget(s, s);
        }
      },

      moveTo: (iso3) =>
        set((s) => {
          const nextMoves = s.current && s.current !== iso3 ? s.moves + 1 : s.moves;
          const nextVisited = new Set(s.visited).add(iso3);
          return { current: iso3, visited: nextVisited, moves: nextMoves, focusIso: iso3 };
        }),

      setFocus: (iso3) => set(() => ({ focusIso: iso3 })),
      setHintTarget: (iso3) => set(() => ({ hintTarget: iso3 })),
      useHint: () => set((s) => ({ hintsLeft: Math.max(0, s.hintsLeft - 1) })),

      startTimerIfNeeded: () => {
        const s = get();
        if (s.mode !== "Time Trial" || s._timer) return;
        const id = window.setInterval(() => {
          const { timeLeft } = get();
          if (timeLeft === null) return;
          if (timeLeft <= 1) {
            window.clearInterval(get()._timer!);
            set({ _timer: null, timeLeft: 0 });
            return;
          }
          set({ timeLeft: timeLeft - 1 });
        }, 1000);
        set({ _timer: id });
      },

      stopTimer: () => {
        const id = get()._timer;
        if (id) {
          window.clearInterval(id);
          set({ _timer: null });
        }
      },

      reset: () => {
        get().stopTimer();
        set(() => ({
          start: null,
          target: null,
          current: null,
          visited: new Set<ISO3>(),
          moves: 0,
          hintsLeft: 3,
          focusIso: null,
          hintTarget: null,
          timeLeft: get().mode === "Time Trial" ? 60 : null,
        }));
      },
    }),
    {
      name: "border-hop",
      partialize: (s) => ({
        ...s,
        visited: Array.from(s.visited),
        _timer: null,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray((state as any).visited)) {
          (state as any).visited = new Set((state as any).visited);
        }
      },
    }
  )
);
