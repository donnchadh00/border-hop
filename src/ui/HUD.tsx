import { useGame } from "../store/game";
import neighbours from "../data/neighbours.json";
import { bfsShortestPath } from "../game/graph";

const ISO = Object.keys(neighbours) as readonly string[];
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

export default function HUD() {
  const { start, target, current, setStartTarget, moveTo, hintsLeft, useHint, visited } = useGame();

  const onStart = () => {
    const s = pick(ISO);
    let t = pick(ISO);
    if (t === s) t = pick(ISO.filter((x) => x !== s));
    setStartTarget(s as any, t as any);
  };

  const shortest = start && target ? bfsShortestPath(neighbours as any, start, target) : null;
  const nextHop =
    shortest && current
      ? shortest[shortest.indexOf(current) + 1]
      : shortest?.[0];

  const onHint = () => {
    if (!current || !nextHop) return;
    useHint();
    // auto-move along the shortest path for now (simple hint)
    if ((neighbours as Record<string, readonly string[]>)[current]?.includes(nextHop)) {
      moveTo(nextHop as any);
    }
  };

  return (
    <div className="fixed left-4 top-4 flex flex-col gap-2 bg-white/80 dark:bg-black/40 backdrop-blur p-3 rounded-xl shadow">
      <div className="font-semibold">Border Hop</div>
      <div className="text-sm opacity-80">
        {start ? <>From <b>{start}</b> to <b>{target}</b></> : "Click start to pick a random route"}
      </div>
      <div className="flex gap-2">
        <button onClick={onStart} className="px-3 py-1 rounded-lg bg-black text-white dark:bg-white dark:text-black">Start</button>
        <button onClick={onHint} disabled={!shortest || !current || hintsLeft===0}
                className="px-3 py-1 rounded-lg border disabled:opacity-50">Hint ({hintsLeft})</button>
      </div>
      <div className="text-xs">
        Current: <b>{current ?? "-"}</b> · Visited: {Array.from(visited).join(", ") || "-"}
      </div>
      <div className="text-xs">
        Shortest: {shortest ? shortest.join(" → ") : "-"}
      </div>
    </div>
  );
}
