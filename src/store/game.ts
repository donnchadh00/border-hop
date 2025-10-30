import { create } from "zustand";
import { persist } from "zustand/middleware";
import neighbours from "../data/neighbours.json";

export type ISO3 = keyof typeof neighbours;

type GameState = {
  // core state
  start: ISO3 | null;
  target: ISO3 | null;
  current: ISO3 | null;
  visited: Set<ISO3>;
  moves: number;
  hintsLeft: number;

  // UI helpers
  focusIso: ISO3 | null;        // keyboard highlight/selection
  hintTarget: ISO3 | null;      // country to visually hint

  // actions
  setStartTarget: (start: ISO3, target: ISO3) => void;
  moveTo: (iso3: ISO3) => void;
  setFocus: (iso3: ISO3 | null) => void;
  setHintTarget: (iso3: ISO3 | null) => void;
  useHint: () => void;
  reset: () => void;
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

      focusIso: null,
      hintTarget: null,

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
        })),

      moveTo: (iso3) =>
        set((s) => {
          const nextMoves = s.current && s.current !== iso3 ? s.moves + 1 : s.moves;
          const nextVisited = new Set(s.visited).add(iso3);
          return {
            current: iso3,
            visited: nextVisited,
            moves: nextMoves,
            focusIso: iso3,
          };
        }),

      setFocus: (iso3) => set(() => ({ focusIso: iso3 })),
      setHintTarget: (iso3) => set(() => ({ hintTarget: iso3 })),

      useHint: () =>
        set((s) => ({ hintsLeft: Math.max(0, s.hintsLeft - 1) })),

      reset: () =>
        set(() => ({
          start: null,
          target: null,
          current: null,
          visited: new Set<ISO3>(),
          moves: 0,
          hintsLeft: 3,
          focusIso: null,
          hintTarget: null,
        })),
    }),
    {
      name: "border-hop",
      // Sets aren’t serialisable; store arrays and rehydrate to Set.
      partialize: (s) => ({
        ...s,
        visited: Array.from(s.visited),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray((state as any).visited)) {
          (state as any).visited = new Set((state as any).visited);
        }
      },
    }
  )
);
