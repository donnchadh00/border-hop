import { create } from "zustand";
import { persist } from "zustand/middleware";
import neighbours from "../data/neighbours.json";
import type { GameMode, ISO3 } from "../game/modes";
import { poolForMode } from "../game/modes";
import { pickReachablePair } from "../game/reachability";
import type { Difficulty } from "../game/difficulty";
import { paramsForDifficulty, attemptBudgetFor } from "../game/difficulty";

const NB = neighbours as Record<string, readonly string[]>;

export type MapProjection = "Mercator" | "NaturalEarth" | "Orthographic";

type GameState = {
  // core
  start: ISO3 | null;
  target: ISO3 | null;
  current: ISO3 | null;
  visited: Set<ISO3>;
  moves: number;
  hintsLeft: number;
  dupGuessIso: ISO3 | null;

  // attempts / fail state
  maxMoves: number | null;
  failed: boolean;

  // UI helpers
  focusIso: ISO3 | null;
  hintTarget: ISO3 | null;

  // modes/timer
  mode: GameMode;
  timeLeft: number | null;
  _timer?: number | null;

  // difficulty
  difficulty: Difficulty;
  lastPickFailed: boolean;
  lastPickMessage: string | null;

  // map projection
  mapProjection: MapProjection;

  // actions
  setMode: (mode: GameMode) => void;
  setDifficulty: (d: Difficulty) => void;
  setMapProjection: (p: MapProjection) => void;
  setStartTarget: (start: ISO3, target: ISO3) => void;
  randomiseReachableRoute: () => boolean;
  moveTo: (iso3: ISO3) => void;
  setFocus: (iso3: ISO3 | null) => void;
  setHintTarget: (iso3: ISO3 | null) => void;
  useHint: () => void;
  startTimerIfNeeded: () => void;
  stopTimer: () => void;
  clearPickStatus: () => void;
  reset: () => void;
  clearDupGuess: () => void;
};

type PersistedGameState = GameState & {
  visited: ISO3[] | Set<ISO3>;
};

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      start: null,
      target: null,
      current: null,
      visited: new Set<ISO3>(),
      moves: 0,
      hintsLeft: 3,
      dupGuessIso: null,

      maxMoves: null,
      failed: false,

      focusIso: null,
      hintTarget: null,

      mode: "World",
      timeLeft: null,
      _timer: null,

      difficulty: "Normal",
      mapProjection: "NaturalEarth",

      lastPickFailed: false,
      lastPickMessage: null,

      setMode: (mode) => {
        const wasTT = get().mode === "Time Trial";
        set({ mode });
        if (mode !== "Time Trial" && wasTT) {
          get().stopTimer();
          set({ timeLeft: null });
        }
      },

      setDifficulty: (d) => set({ difficulty: d }),

      setMapProjection: (p) => set({ mapProjection: p }),

      setStartTarget: (start, target) =>
        set(() => {
          const { maxHops } = paramsForDifficulty(get().difficulty);
          const hopCap = Number.isFinite(maxHops)
            ? (maxHops as number)
            : null;

          return {
            start,
            target,
            current: start,
            visited: new Set([start, target]),
            moves: 0,
            hintsLeft: 3,
            focusIso: start,
            hintTarget: null,
            timeLeft: get().mode === "Time Trial" ? 60 : null,
            maxMoves: hopCap,
            failed: false,
          };
        }),

      randomiseReachableRoute: () => {
        const state = get();
        const pool = poolForMode(state.mode) as readonly ISO3[];
        const { minHops, maxHops } = paramsForDifficulty(state.difficulty);
        const maxAttempts = attemptBudgetFor(
          state.difficulty,
          minHops,
          pool.length
        );

        const pick = pickReachablePair(NB, pool, {
          minHops,
          maxHops,
          maxAttempts,
        });

        if (pick) {
          state.setStartTarget(pick.start as ISO3, pick.target as ISO3);
          set({ lastPickFailed: false, lastPickMessage: null });
          return true;
        }

        set({
          lastPickFailed: true,
          lastPickMessage:
            `No route found within constraints (min ${minHops} hops` +
            `${Number.isFinite(maxHops) ? `, max ${maxHops} hops` : ""}; ` +
            `tried ${maxAttempts} pairs). Try an easier difficulty or lower min hops.`,
        });
        return false;
      },

      moveTo: (iso3) =>
        set((s) => {
          if (s.failed) return s;

          if (s.visited.has(iso3)) {
            return {
              ...s,
              current: iso3,
              focusIso: iso3,
              dupGuessIso: iso3,
            }
          }

          const isNewMove = s.current && s.current !== iso3;
          const nextMoves = isNewMove ? s.moves + 1 : s.moves;

          let failed: boolean = s.failed;

          if (isNewMove && s.maxMoves != null) {
            const movesUsed = nextMoves;

            if (movesUsed >= s.maxMoves && iso3 !== s.target) {
              failed = true;
            }
          }

          const nextVisited = new Set(s.visited).add(iso3);

          return {
            current: iso3,
            visited: nextVisited,
            moves: nextMoves,
            failed,
            focusIso: iso3,
          };
        }),

      setFocus: (iso3) => set({ focusIso: iso3 }),

      setHintTarget: (iso3) => set({ hintTarget: iso3 }),

      useHint: () =>
        set((s) => ({ hintsLeft: Math.max(0, s.hintsLeft - 1) })),

      clearDupGuess: () => set({ dupGuessIso: null }),

      startTimerIfNeeded: () => {
        const s = get();
        if (s.mode !== "Time Trial" || s._timer) return;
        const id = window.setInterval(() => {
          const tl = get().timeLeft;
          if (tl == null) return;
          if (tl <= 1) {
            window.clearInterval(get()._timer!);
            set({ _timer: null, timeLeft: 0 });
            return;
          }
          set({ timeLeft: tl - 1 });
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

      clearPickStatus: () =>
        set({ lastPickFailed: false, lastPickMessage: null }),

      reset: () => {
        get().stopTimer();
        set(() => ({
          start: null,
          target: null,
          current: null,
          visited: new Set<ISO3>(),
          moves: 0,
          hintsLeft: 3,
          maxMoves: null,
          failed: false,
          focusIso: null,
          hintTarget: null,
          dupGuessIso: null,
          timeLeft: get().mode === "Time Trial" ? 60 : null,
          lastPickFailed: false,
          lastPickMessage: null,
        }));
      },
    }),
    {
      name: "border-hop",
      partialize: (s) => ({
        ...s,
        visited: Array.from(s.visited),
        _timer: null,
        lastPickFailed: false,
        lastPickMessage: null,
        dupGuessIso: null,
      }),
      onRehydrateStorage: () => (state) => {
        const persistedState = state as PersistedGameState | undefined;

        if (persistedState && Array.isArray(persistedState.visited)) {
          persistedState.visited = new Set(persistedState.visited);
        }
      },
    }
  )
);
