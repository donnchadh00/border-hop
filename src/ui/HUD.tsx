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

const isWinningPosition = (
  currentIso: string | null,
  targetIso: string | null
) => {
  if (!currentIso || !targetIso) return false;

  if (currentIso === targetIso) return true;

  const neighboursOfTarget = NB[targetIso] ?? [];
  return neighboursOfTarget.includes(currentIso);
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

  const won = isWinningPosition(current, target);
  const lost = failed && !won;

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
            onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}
            className="border rounded px-2 py-1 bg-white/70 dark:bg-slate-800"
          >
            <option>Easy</option>
            <option>Normal</option>
            <option>Hard</option>
            <option>Extreme</option>
          </select>
        </div>

        {/* Hops indicator */}
        <div className="text-xs mt-1">
          Hops:&nbsp;
          <b>{hopsUsed}</b>
          {hopCap != null ? (
            <>
              &nbsp;/&nbsp;<b>{hopCap}</b>
              {nearCap && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                  near cap
                </span>
              )}
              {overCap && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
                  over cap
                </span>
              )}
            </>
          ) : (
            <> / ∞</>
          )}

          {hopCap != null && (
            <div className="mt-1 h-1.5 w-56 rounded bg-slate-200 dark:bg-slate-800 overflow-hidden">
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

        {dupGuessIso && (
          <div className="text-xs mt-1 p-2 rounded-lg bg-sky-100 text-sky-800 border border-sky-300">
            <div className="font-medium mb-0.5">Already guessed</div>
            <div className="opacity-90">
              You’ve already visited <b>{nameOf(dupGuessIso)}</b>.
            </div>
          </div>
        )}

        {/* Failure toast for route picking */}
        {lastPickFailed && (
          <div className="text-xs p-2 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
            <div className="font-medium mb-1">Couldn’t find a route</div>
            <div className="opacity-90 mb-2">{lastPickMessage}</div>
            <div className="flex gap-2">
              <button
                onClick={relaxDifficulty}
                className="px-2 py-1 rounded border border-amber-400 bg-white"
              >
                Try Easier
              </button>
              <button
                onClick={allowShorterPaths}
                className="px-2 py-1 rounded border border-amber-400 bg-white"
              >
                Allow Shorter Paths
              </button>
              <button
                onClick={clearPickStatus}
                className="ml-auto px-2 py-1 rounded border border-amber-400 bg-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {isOutlineMode(mode) && (
          <div className="text-xs opacity-70">
            Only start/end outlines are shown. Guessed countries will fill in.
          </div>
        )}

        <div className="text-sm opacity-80">
          {start ? (
            <>
              From <b>{nameOf(start)}</b> to <b>{nameOf(target)}</b>
            </>
          ) : (
            "Click start to pick a random route"
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onStart}
            className="px-3 py-1 rounded-lg bg-black text-white dark:bg-white dark:text-black"
          >
            Start
          </button>
          <button
            onClick={onHint}
            disabled={!shortest || !current || hintsLeft === 0}
            className="px-3 py-1 rounded-lg border disabled:opacity-50"
          >
            Hint ({hintsLeft})
          </button>
        </div>

        <div className="text-xs">
          Current: <b>{nameOf(current)}</b> · Moves: <b>{moves}</b> · Visited:{" "}
          {Array.from(visited)
            .map((iso) => nameOf(iso))
            .join(", ") || "-"}
        </div>
        <div className="text-xs">
          Shortest: {shortest ? shortest.join(" → ") : "-"}
        </div>

        <div>
          <CountrySearch 
            source="/countries.geojson"
            allowedIso3={allowedIso3}
          />
        </div>
      </div>

      {/* Win overlay */}
      {won && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-2xl shadow-2xl w-[min(92vw,28rem)]">
            <div className="text-xl font-semibold mb-2">You made it!</div>
            <div className="opacity-80 mb-4">
              Path from <b>{nameOf(start)}</b> to <b>{nameOf(target)}</b> in <b>{moves+1}</b>{" "}
              moves.
            </div>
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
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-2xl shadow-2xl w-[min(92vw,28rem)]">
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
