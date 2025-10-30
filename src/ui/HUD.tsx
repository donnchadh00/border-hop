import { useEffect } from "react";
import { useGame } from "../store/game";
import neighbours from "../data/neighbours.json";
import { bfsShortestPath } from "../game/graph";

const ISO = Object.keys(neighbours) as readonly string[];
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

export default function HUD() {
  const {
    start, target, current, visited, moves,
    hintsLeft, useHint, setStartTarget, setHintTarget, hintTarget, reset
  } = useGame();

  const onStart = () => {
    const s = pick(ISO) as any;
    let t = pick(ISO) as any;
    if (t === s) t = pick(ISO.filter((x) => x !== s)) as any;
    setStartTarget(s, t);
  };

  const shortest = start && target ? bfsShortestPath(neighbours as any, start, target) : null;
  const nextHop =
    shortest && current
      ? shortest[shortest.indexOf(current) + 1]
      : shortest?.[0];

  const onHint = () => {
    if (!current || !nextHop || hintsLeft === 0) return;
    useHint();
    setHintTarget(nextHop as any);
  };

  // auto-clear hint glow after a short period
  useEffect(() => {
    if (!hintTarget) return;
    const id = setTimeout(() => setHintTarget(null), 1800);
    return () => clearTimeout(id);
  }, [hintTarget, setHintTarget]);

  const won = current && target && current === target;

  const playAgain = () => {
    reset();
    onStart();
  };

  return (
    <>
      <div className="fixed left-4 top-4 flex flex-col gap-2 bg-white/80 dark:bg-black/40 backdrop-blur p-3 rounded-xl shadow">
        <div className="font-semibold">Border Hop</div>
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
