import { create } from "zustand";
import neighboursData from "../data/neighbours.json";

export type ISO3 = keyof typeof neighboursData;

type GameState = {
  start: ISO3 | null;
  target: ISO3 | null;
  current: ISO3 | null;
  visited: Set<ISO3>;
  hintsLeft: number;
  setStartTarget: (start: ISO3, target: ISO3) => void;
  moveTo: (iso3: ISO3) => void;
  useHint: () => void;
  reset: () => void;
};

export const useGame = create<GameState>((set) => ({
  start: null,
  target: null,
  current: null,
  visited: new Set<ISO3>(),
  hintsLeft: 3,
  setStartTarget: (start, target) =>
    set(() => ({ start, target, current: start, visited: new Set([start]) })),
  moveTo: (iso3) =>
    set((s) => ({ current: iso3, visited: new Set(s.visited).add(iso3) })),
  useHint: () => set((s) => ({ hintsLeft: Math.max(0, s.hintsLeft - 1) })),
  reset: () =>
    set(() => ({
      start: null,
      target: null,
      current: null,
      visited: new Set(),
      hintsLeft: 3,
    })),
}));
