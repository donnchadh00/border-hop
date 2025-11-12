import { useEffect } from "react";
import { useGame } from "../store/game";
import neighbours from "../data/neighbours.json";
import { bfsShortestPath } from "../game/graph";
import CountrySearch from "./CountrySearch";
import type { GameMode } from "../game/modes";
import type { Difficulty } from "../game/difficulty";

const NB = neighbours as Record<string, readonly string[]>;

export default function HUD() {
  const {
    start, target, current, visited, moves,
    hintsLeft, useHint, setHintTarget, hintTarget, reset,
    mode, setMode,
    difficulty, setDifficulty,
    randomiseReachableRoute, startTimerIfNeeded,
  } = useGame();

  const onStart = () => {
    randomiseReachableRoute();
    startTimerIfNeeded();
  };

  const shortest = start && target ? bfsShortestPath(NB, start, target) : null;
  const nextHop = shortest && current ? shortest[shortest.indexOf(current) + 1] : shortest?.[0];

  const onHint = () => {
    if (!current || !nextHop || hintsLeft === 0) return;
    useHint();
    setHintTarget(nextHop as any);
  };

  useEffect(() => {
    if (!hintTarget) return;
    const id = setTimeout(() => setHintTarget(null), 1800);
    return () => clearTimeout(id);
  }, [hintTarget, setHintTarget]);

  const won = !!current && !!target && current === target;

  const playAgain = () => {
    reset();
    onStart();
  };

  return (
    <>
      <div className="fixed left-4 top-4 flex flex-col gap-2 bg-white/80 dark:bg-black/40 backdrop-blur p-3 rounded-xl shadow">
        <div className="font-semibold">Border Hop</div>

        {/* Mode & Difficulty */}
        <div className="flex items-center gap-2 text-sm">
          <label className="opacity-80">Mode:</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as GameMode)}
            className="border rounded px-2 py-1 bg-white/70 dark:bg-slate-800"
          >
            <option>World</option>
            <option>Europe</option>
            <option>Time Trial</option>
            <option>Outline</option>
          </select>

          <label className="opacity-80 ml-3">Difficulty:</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="border rounded px-2 py-1 bg-white/70 dark:bg-slate-800"
          >
            <option>Easy</option>
            <option>Normal</option>
            <option>Hard</option>
            <option>Extreme</option>
          </select>
        </div>

        {mode === "Outline" && (
          <div className="text-xs opacity-70">
            Only start/end outlines are shown. Guessed countries will fill in.
          </div>
        )}

        <div className="text-sm opacity-80">
          {start ? <>From <b>{start}</b> to <b>{target}</b></> : "Click start to pick a random route"}
        </div>

        <div className="flex gap-2">
          <button onClick={onStart} className="px-3 py-1 rounded-lg bg-black text-white dark:bg-white dark:text-black">
            Start
          </button>
          <button onClick={onHint} disabled={!shortest || !current || hintsLeft === 0}
                  className="px-3 py-1 rounded-lg border disabled:opacity-50">
            Hint ({hintsLeft})
          </button>
        </div>

        <div className="text-xs">
          Current: <b>{current ?? "-"}</b> · Moves: <b>{moves}</b> · Visited: {Array.from(visited).join(", ") || "-"}
        </div>
        <div className="text-xs">
          Shortest: {shortest ? shortest.join(" → ") : "-"}
        </div>

        <div>
          <CountrySearch source="/countries.geojson" />
        </div>
      </div>

      {won && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-2xl shadow-2xl w-[min(92vw,28rem)]">
            <div className="text-xl font-semibold mb-2">You made it! 🎉</div>
            <div className="opacity-80 mb-4">
              Path from <b>{start}</b> to <b>{target}</b> in <b>{moves}</b> moves.
            </div>
            <div className="flex gap-2">
              <button onClick={playAgain} className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black">
                Play again
              </button>
              <button onClick={reset} className="px-4 py-2 rounded-lg border">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
