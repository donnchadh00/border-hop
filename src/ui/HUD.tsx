import { useEffect } from "react";
import { useGame } from "../store/game";
import neighbours from "../data/neighbours.json";
import { bfsShortestPath } from "../game/graph";
import CountrySearch from "./CountrySearch";
import type { GameMode } from "../game/modes";
import { EUROPE } from "../game/modes";
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
        <div className="hud-bar h-full w-full flex justify-center">
          <div className="hud-inner h-full w-full max-w-6xl px-4 py-2 flex flex-col gap-2">
            {/* Row 1: title, mode/difficulty, search, start/hint */}
            <div className="flex items-center justify-between gap-4 text-sm">
              {/* Title */}
              <div className="hud-title font-semibold text-base tracking-tight">
                Border Hop
              </div>

              {/* Mode & Difficulty (dropdowns) */}
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex flex-col gap-0.5">
                  <span className="hud-label">
                    Mode
                  </span>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as GameMode)}
                    className="hud-select min-w-[8rem]"
                  >
                    <option>World</option>
                    <option>Europe</option>
                    <option>Practice</option>
                    {/* <option>Time Trial</option> */}
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <span className="hud-label">
                    Difficulty
                  </span>
                  <select
                    value={difficulty}
                    onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}
                    className="hud-select min-w-[8rem]"
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
                  className="hud-button-primary px-3 py-1.5 text-xs"
                >
                  Start
                </button>
                <button
                  onClick={onHint}
                  disabled={!shortest || !current || hintsLeft === 0}
                  className="hud-button-secondary px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  Hint ({hintsLeft})
                </button>
              </div>
            </div>

            {/* Row 2: hops, route text, visited, toasts */}
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
                        <span className="hud-chip hud-chip-warning ml-2">
                          near cap
                        </span>
                      )}
                      {overCap && (
                        <span className="hud-chip hud-chip-error ml-2">
                          over cap
                        </span>
                      )}
                    </>
                  ) : (
                    <> / ∞</>
                  )}
                </div>

                {hopCap != null && (
                  <div className="hud-hops-track mt-1 h-1.5 w-56 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        overCap
                          ? "hud-hops-fill-error"
                          : nearCap
                          ? "hud-hops-fill-warning"
                          : "hud-hops-fill-ok"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Route text */}
              <div className="flex flex-col gap-0.5 text-[11px] sm:text-xs max-w-[20rem] sm:max-w-md">
                <div className="hud-muted truncate">
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

              {/* Visited summary */}
              <div className="truncate max-w-full sm:max-w-xl">
                Visited:{" "}
                {Array.from(visited)
                  .map((iso) => nameOf(iso))
                  .join(", ") || "-"}
              </div>

              {/* Toasts */}
              <div className="flex flex-wrap items-start gap-2">
                {dupGuessIso && (
                  <div className="hud-toast hud-toast-info text-[11px] max-w-xs">
                    <div className="font-medium mb-0.5">Already guessed</div>
                    <div className="opacity-90">
                      You’ve already visited <b>{nameOf(dupGuessIso)}</b>.
                    </div>
                  </div>
                )}

                {lastPickFailed && (
                  <div className="hud-toast hud-toast-warning text-[11px] max-w-xs">
                    <div className="font-medium mb-0.5">Couldn’t find a route</div>
                    <div className="opacity-90 mb-1">{lastPickMessage}</div>
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={relaxDifficulty}
                        className="hud-mini-button"
                      >
                        Try easier
                      </button>
                      <button
                        onClick={allowShorterPaths}
                        className="hud-mini-button"
                      >
                        Allow shorter paths
                      </button>
                      <button
                        onClick={clearPickStatus}
                        className="hud-mini-button ml-auto"
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
              <b>{moves + 1}</b> moves.
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
              You used <b>{moves + 1}</b>
              {hopCap != null && (
                <>
                  {" "}
                  / <b>{hopCap}</b>
                </>
              )}{" "}
              hops and didn’t reach the target.
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
