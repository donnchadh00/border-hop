import { useEffect } from "react";
import { useGame } from "../store/game";
import neighbours from "../data/neighbours.json";
import { bfsShortestPath } from "../game/graph";
import CountrySearch from "./CountrySearch";
import type { GameMode } from "../game/modes";
import { EUROPE, isOutlineMode } from "../game/modes";
import type { Difficulty } from "../game/difficulty";
import { useCountryNames } from "../lib/useCountryNames";

const NB = neighbours as Record<string, readonly string[]>;

function isWinningPosition(
  startIso: string | null,
  targetIso: string | null,
  visited: Set<string>
): boolean {
  if (!startIso || !targetIso) return false;
  if (!visited.has(startIso)) return false;

  const candidates: string[] = [];
  if (visited.has(targetIso)) candidates.push(targetIso);

  const neighboursOfTarget = NB[targetIso] ?? [];
  for (const nb of neighboursOfTarget) {
    if (visited.has(nb)) candidates.push(nb);
  }

  if (candidates.length === 0) return false;

  const bfsWithinVisited = (goal: string): boolean => {
    const queue: string[] = [startIso];
    const seen = new Set<string>([startIso]);

    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === goal) return true;

      for (const nb of NB[cur] ?? []) {
        if (!visited.has(nb) || seen.has(nb)) continue;
        seen.add(nb);
        queue.push(nb);
      }
    }
    return false;
  };

  for (const end of candidates) {
    if (bfsWithinVisited(end)) return true;
  }

  return false;
}

export default function HUD() {
  const {
    start,
    target,
    current,
    visited,
    moves,
    hintsLeft,
    useHint,
    setHintTarget,
    hintTarget,
    reset,
    mode,
    setMode,
    difficulty,
    setDifficulty,
    randomiseReachableRoute,
    startTimerIfNeeded,
    lastPickFailed,
    lastPickMessage,
    clearPickStatus,
    maxMoves,
    failed,
    dupGuessIso,
    clearDupGuess,
  } = useGame();

  const hopCap = maxMoves;
  const hopsUsed = moves;

  const overCap = hopCap != null ? hopsUsed >= hopCap : false;
  const hopsLeft = hopCap != null ? Math.max(0, hopCap - hopsUsed) : Infinity;
  const nearCap = hopCap != null ? !overCap && hopsLeft <= 2 : false;

  const allowedIso3 =
  mode === "Europe"
    ? EUROPE
    : undefined;

  const pct =
    hopCap != null
      ? Math.max(0, Math.min(100, Math.round((hopsUsed / hopCap) * 100)))
      : 0;

  const { nameOf } = useCountryNames("/countries.geojson");

  const onStart = () => {
    const ok = randomiseReachableRoute();
    console.log(
      "route ok?",
      ok,
      useGame.getState().lastPickFailed,
      useGame.getState().lastPickMessage
    );
    if (ok) startTimerIfNeeded();
  };

  const shortest =
    start && target ? bfsShortestPath(NB, start, target) : null;
  const nextHop =
    shortest && current
      ? shortest[shortest.indexOf(current) + 1]
      : shortest?.[0];
  const optimalHops = shortest ? shortest.length - 1 : null;
  const optimalPathNames = shortest ? shortest.map((iso) => nameOf(iso as any)) : null;

  const onHint = () => {
    if (!current || !nextHop || hintsLeft === 0) return;
    useHint();
    setHintTarget(nextHop as any);
  };

  const onDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    clearPickStatus();
    onStart();
  }

  const relaxDifficulty = () => {
    setDifficulty("Easy" as Difficulty);
    clearPickStatus();
    onStart();
  };

  const allowShorterPaths = () => {
    setDifficulty("Normal" as Difficulty);
    clearPickStatus();
    onStart();
  };

  useEffect(() => {
    if (!hintTarget) return;
    const id = setTimeout(() => setHintTarget(null), 1800);
    return () => clearTimeout(id);
  }, [hintTarget, setHintTarget]);

  useEffect(() => {
    if (!dupGuessIso) return;
    const id = setTimeout(() => clearDupGuess(), 1500);
    return () => clearTimeout(id);
  }, [dupGuessIso, clearDupGuess]);

  const won =
    !!start && !!target &&
    isWinningPosition(start, target, visited);
  const lost = failed && !won;

  const playAgain = () => {
    reset();
    onStart();
  };

  return (
    <>
      {/* Top HUD bar */}
      <div className="fixed inset-x-0 top-0 z-40">
        <div className="h-full w-full bg-white/90 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200/70 dark:border-slate-800 shadow-sm flex justify-center">
          <div className="h-full w-full max-w-6xl px-4 py-2 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4 text-sm">
              {/* Title */}
              <div className="font-semibold text-base tracking-tight">
                Border Hop
              </div>

              {/* Mode & Difficulty (dropdowns) */}
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex flex-col gap-0.5">
                  <span className="uppercase tracking-wide text-slate-500">
                    Mode
                  </span>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as GameMode)}
                    className="min-w-[8rem] rounded-md border border-slate-300/80 bg-white/80 dark:bg-slate-900/80 px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option>World</option>
                    <option>Europe</option>
                    <option>Time Trial</option>
                    <option>Outline</option>
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="uppercase tracking-wide text-slate-500">
                    Difficulty
                  </span>
                  <select
                    value={difficulty}
                    onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}
                    className="min-w-[8rem] rounded-md border border-slate-300/80 bg-white/80 dark:bg-slate-900/80 px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option>Easy</option>
                    <option>Normal</option>
                    <option>Hard</option>
                    <option>Extreme</option>
                  </select>
                </div>
              </div>

              {/* Search bar */}
              <div className="w-full sm:w-auto flex-shrink-0">
                <CountrySearch
                  source="/countries.geojson"
                  allowedIso3={allowedIso3}
                />
              </div>

              {/* Start / Hint buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={onStart}
                  className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-medium dark:bg-white dark:text-black shadow-sm hover:opacity-90 transition"
                >
                  Start
                </button>
                <button
                  onClick={onHint}
                  disabled={!shortest || !current || hintsLeft === 0}
                  className="px-3 py-1.5 rounded-full border border-slate-300/80 text-xs font-medium bg-white/80 dark:bg-slate-900/80 disabled:opacity-50 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Hint ({hintsLeft})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Hops indicator */}
              <div className="min-w-[14rem]">
                <div>
                  Hops:&nbsp;
                  <b>{hopsUsed}</b>
                  {hopCap != null ? (
                    <>
                      &nbsp;/&nbsp;<b>{hopCap}</b>
                      {nearCap && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                          near cap
                        </span>
                      )}
                      {overCap && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-200">
                          over cap
                        </span>
                      )}
                    </>
                  ) : (
                    <> / ∞</>
                  )}
                </div>

                {hopCap != null && (
                  <div className="mt-1 h-1.5 w-56 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${
                        overCap
                          ? "bg-rose-500"
                          : nearCap
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Route text */}
              <div className="flex flex-col gap-0.5 text-[30px] sm:text-xs max-w-[20rem] sm:max-w-md">
                <div className="opacity-80 truncate">
                  {start ? (
                    <>
                      From <b>{nameOf(start)}</b> to <b>{nameOf(target)}</b>
                    </>
                  ) : (
                    "Click Start to pick a random route"
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="truncate">
                    Current: <b>{nameOf(current)}</b> · Moves: <b>{moves}</b>
                  </div>
                </div>
              </div>

              <div className="truncate max-w-full sm:max-w-xl">
                Visited:{" "}
                {Array.from(visited)
                  .map((iso) => nameOf(iso))
                  .join(", ") || "-"}
              </div>


              {/* Toasts */}
              <div className="flex flex-wrap items-start gap-2">
                {dupGuessIso && (
                  <div className="text-[11px] px-2 py-1.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200 shadow-sm">
                    <div className="font-medium mb-0.5">Already guessed</div>
                    <div className="opacity-90">
                      You’ve already visited <b>{nameOf(dupGuessIso)}</b>.
                    </div>
                  </div>
                )}

                {lastPickFailed && (
                  <div className="text-[11px] max-w-xs px-2 py-1.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 shadow-sm">
                    <div className="font-medium mb-0.5">Couldn’t find a route</div>
                    <div className="opacity-90 mb-1">{lastPickMessage}</div>
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={relaxDifficulty}
                        className="px-2 py-0.5 rounded border border-amber-300 bg-white text-[11px]"
                      >
                        Try easier
                      </button>
                      <button
                        onClick={allowShorterPaths}
                        className="px-2 py-0.5 rounded border border-amber-300 bg-white text-[11px]"
                      >
                        Allow shorter paths
                      </button>
                      <button
                        onClick={clearPickStatus}
                        className="ml-auto px-2 py-0.5 rounded border border-amber-300 bg-white text-[11px]"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Win overlay */}
      {won && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-2xl shadow-2xl w-[min(92vw,28rem)] max-h-[90vh] overflow-y-auto">
            <div className="text-xl font-semibold mb-2">You made it!</div>
            <div className="opacity-80 mb-4">
              Path from <b>{nameOf(start)}</b> to <b>{nameOf(target)}</b> in{" "}
              <b>{moves}</b> moves.
              {optimalHops != null && (
                <>
                  {" "}
                  (shortest path is <b>{optimalHops}</b> moves)
                </>
              )}
            </div>
            {optimalPathNames && (
              <div className="text-sm opacity-80 mb-4">
                <div className="font-medium mb-1">Shortest path:</div>
                <div className="text-xs sm:text-sm break-words">
                  {optimalPathNames.join(" → ")}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={playAgain}
                className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black"
              >
                Play again
              </button>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg border"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lose overlay */}
      {lost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-2xl shadow-2xl w-[min(92vw,28rem)] max-h-[90vh] overflow-y-auto">
            <div className="text-xl font-semibold mb-2">Out of hops!</div>
            <div className="opacity-80 mb-4">
              You used <b>{moves}</b>
              {hopCap != null && (
                <>
                  {" "}
                  / <b>{hopCap}</b>
                </>
              )}{" "}
              hops and didn’t reach the target.
            </div>
            <div className="flex gap-2">
              <button
                onClick={playAgain}
                className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black"
              >
                Try a new route
              </button>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg border"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
