import { useEffect, useState } from "react";
import { useGame, type MapProjection } from "../store/game";
import neighbours from "../data/neighbours.json";
import { bfsShortestPath } from "../game/graph";
import CountrySearch from "./CountrySearch";
import type { GameMode, ISO3 } from "../game/modes";
import { EUROPE, ASIA, AFRICA, AMERICAS } from "../game/modes";
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

function RouteMarker({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "start" | "target" | "current";
}) {
  const toneClasses =
    tone === "start"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
      : tone === "target"
      ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
      : "border-sky-400/40 bg-sky-500/10 text-sky-200";

  const dotClasses =
    tone === "start"
      ? "bg-emerald-400"
      : tone === "target"
      ? "bg-rose-400"
      : "bg-sky-400";

  return (
    <div
      className={`rounded-xl border px-3 py-2 min-w-0 flex-1 sm:flex-none sm:min-w-[10rem] ${toneClasses}`}
    >
      <div className="flex items-center gap-2 text-[10px] sm:text-[11px] uppercase tracking-[0.16em] opacity-80">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClasses}`} />
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm sm:text-base font-semibold leading-tight">
        {value}
      </div>
    </div>
  );
}

function ResultCard({
  title,
  summary,
  optimalPathNames,
  primaryActionLabel,
  onPrimaryAction,
  minimized,
  onToggleMinimized,
}: {
  title: string;
  summary: React.ReactNode;
  optimalPathNames: string[] | null;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  minimized: boolean;
  onToggleMinimized: () => void;
}) {
  if (minimized) {
    return (
      <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-4 sm:bottom-4">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-slate-100 shadow-sm backdrop-blur-md">
          <div className="text-sm font-medium">{title}</div>
          <button
            onClick={onPrimaryAction}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-950"
          >
            {primaryActionLabel}
          </button>
          <button
            onClick={onToggleMinimized}
            aria-label="Expand result card"
            className="ml-auto rounded-lg bg-sky-400/30 px-2 py-1 text-xs font-semibold text-sky-50 ring-1 ring-sky-300/45"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 w-auto rounded-2xl border border-slate-700 bg-slate-900/90 p-4 text-slate-100 shadow-sm backdrop-blur-md sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[min(92vw,28rem)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-lg font-semibold">{title}</div>
        <button
          onClick={onToggleMinimized}
          aria-label="Minimize result card"
          className="rounded-lg bg-sky-400/30 px-2 py-1 text-xs font-semibold text-sky-50 ring-1 ring-sky-300/45"
        >
          -
        </button>
      </div>
      <div className="mt-2 text-sm text-slate-300">{summary}</div>
      {optimalPathNames && (
        <div className="mt-4 text-sm text-slate-300">
          <div className="mb-1 font-medium text-slate-100">Shortest path</div>
          <div className="text-xs sm:text-sm break-words">
            {optimalPathNames.join(" → ")}
          </div>
        </div>
      )}
      <div className="mt-4">
        <button
          onClick={onPrimaryAction}
          className="w-full px-4 py-2 rounded-lg bg-white text-slate-950"
        >
          {primaryActionLabel}
        </button>
      </div>
    </div>
  );
}

export default function HUD() {
  const [resultCardMinimized, setResultCardMinimized] = useState(false);
  const {
    start,
    target,
    current,
    visited,
    moves,
    hintsLeft,
    useHint: spendHint,
    setHintTarget,
    hintTarget,
    reset,
    mode,
    setMode,
    difficulty,
    setDifficulty,
    mapProjection,
    setMapProjection,
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

  const atCap = hopCap != null ? hopsUsed === hopCap : false;
  const hopsLeft = hopCap != null ? Math.max(0, hopCap - hopsUsed) : Infinity;
  const nearCap = hopCap != null ? !atCap && hopsLeft <= 2 : false;

  const allowedIso3 =
  mode === "Europe"
    ? EUROPE
    : mode === "Asia"
    ? ASIA
    : mode === "Africa"
    ? AFRICA
    : mode === "Americas"
    ? AMERICAS
    : undefined;

  const pct =
    hopCap != null
      ? Math.max(0, Math.min(100, Math.round((hopsUsed / hopCap) * 100)))
      : 0;

  const { nameOf } = useCountryNames("/countries.cleaned.simplified.geojson");

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
  const optimalPathNames = shortest ? shortest.map((iso) => nameOf(iso)) : null;
  const visitedNames = Array.from(visited)
    .filter((iso) => iso !== target)
    .map((iso) => nameOf(iso));

  const onHint = () => {
    if (!current || !nextHop || hintsLeft === 0) return;
    spendHint();
    setHintTarget(nextHop as ISO3);
  };

  const onDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    clearPickStatus();
    onStart();
  }

  const onModeChange = (m: GameMode) => {
    setMode(m);
    clearPickStatus();
    if (m === "Practice") return;
    onStart();
  };

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

  useEffect(() => {
    if (start || target) return;
    const ok = randomiseReachableRoute();
    if (ok) startTimerIfNeeded();
  }, [start, target, randomiseReachableRoute, startTimerIfNeeded]);

  const won =
    !!start && !!target &&
    isWinningPosition(start, target, visited);
  const lost = failed && !won;

  useEffect(() => {
    if (won || lost) {
      setResultCardMinimized(false);
    }
  }, [won, lost]);

  const playAgain = () => {
    reset();
    onStart();
  };

  return (
    <>
      {/* Desktop HUD */}
      <div className="fixed inset-x-0 top-0 z-40 hidden sm:block">
        <div className="hud-bar h-full w-full flex justify-center">
          <div className="hud-inner h-full w-full max-w-6xl px-4 py-2 flex flex-col gap-2">
            {/* Row 1: title, mode/difficulty, search, start/hint */}
            <div className="flex items-center justify-between gap-4 text-sm">
              {/* Title */}
              <div className="hud-title flex items-center gap-2 font-semibold text-base tracking-tight">
                <img
                  src="/globe.svg"
                  alt="Border Hop"
                  className="w-6 h-6"
                />
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
                    onChange={(e) => onModeChange(e.target.value as GameMode)}
                    className="hud-select min-w-[8rem]"
                  >
                    <option>World</option>
                    <option>Europe</option>
                    <option>Asia</option>
                    <option>Africa</option>
                    <option>Americas</option>
                    <option>Practice</option>
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

                <div className="flex flex-col gap-0.5">
                  <span className="hud-label">
                    Projection
                  </span>
                  <select
                    value={mapProjection}
                    onChange={(e) => setMapProjection(e.target.value as MapProjection)}
                    className="hud-select min-w-[8rem]"
                  >
                    <option value="Mercator">Mercator</option>
                    <option value="NaturalEarth">Natural Earth</option>
                  </select>
                </div>
              </div>

              <div className="w-full sm:w-auto flex-shrink-0">
                <CountrySearch
                  source="/countries.cleaned.simplified.geojson"
                  allowedIso3={allowedIso3}
                />
              </div>

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

            <div className="flex flex-wrap items-center gap-3 text-xs">
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
                      {atCap && (
                        <span className="hud-chip hud-chip-error ml-2">
                          at cap
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
                        atCap
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

              <div className="flex flex-wrap items-stretch gap-2">
                {start ? (
                  <>
                    <RouteMarker label="Start" value={nameOf(start)} tone="start" />
                    <RouteMarker label="Target" value={nameOf(target)} tone="target" />
                    <RouteMarker label="Current" value={nameOf(current)} tone="current" />
                  </>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs sm:text-sm text-slate-300">
                    Click <b>Start</b> to generate a route.
                  </div>
                )}
              </div>

              <div className="truncate max-w-full sm:max-w-xl">
                Visited: {visitedNames.join(", ") || "-"}
              </div>

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

      {/* Mobile HUD */}
      <div className="fixed inset-x-0 top-0 z-40 sm:hidden">
        <div className="hud-bar mx-2 mt-2 rounded-2xl border border-white/10">
          <div className="px-3 py-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="hud-title flex items-center gap-2 text-sm font-semibold tracking-tight">
                <img
                  src="/globe.svg"
                  alt="Border Hop"
                  className="h-5 w-5"
                />
                Border Hop
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onStart}
                  className="hud-button-primary px-3 py-1.5 text-xs"
                >
                  Start
                </button>
                <button
                  onClick={onHint}
                  disabled={!shortest || !current || hintsLeft === 0}
                  className="hud-button-secondary px-2.5 py-1.5 text-xs disabled:opacity-50"
                >
                  Hint {hintsLeft}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
              <span>
                <span className="text-slate-400">Mode:</span> {mode}
              </span>
              <span>
                <span className="text-slate-400">Hops:</span> {hopsUsed}{hopCap != null ? ` / ${hopCap}` : " / ∞"}
              </span>
              {target && (
                <span>
                  <span className="text-slate-400">Target:</span> {nameOf(target)}
                </span>
              )}
              {current && (
                <span>
                  <span className="text-slate-400">Current:</span> {nameOf(current)}
                </span>
              )}
              {nearCap && <span className="text-amber-300">Near cap</span>}
              {atCap && <span className="text-rose-300">At cap</span>}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="mx-auto min-w-0 max-w-sm">
                <CountrySearch
                  source="/countries.cleaned.simplified.geojson"
                  allowedIso3={allowedIso3}
                />
              </div>
            </div>

            <details className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <summary className="cursor-pointer list-none text-sm font-medium">
                Options
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="hud-label">Mode</span>
                    <select
                      value={mode}
                      onChange={(e) => onModeChange(e.target.value as GameMode)}
                      className="hud-select min-w-0"
                    >
                      <option>World</option>
                      <option>Europe</option>
                      <option>Asia</option>
                      <option>Africa</option>
                      <option>Americas</option>
                      <option>Practice</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="hud-label">Difficulty</span>
                    <select
                      value={difficulty}
                      onChange={(e) => onDifficultyChange(e.target.value as Difficulty)}
                      className="hud-select min-w-0"
                    >
                      <option>Easy</option>
                      <option>Normal</option>
                      <option>Hard</option>
                      <option>Extreme</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="hud-label">Projection</span>
                    <select
                      value={mapProjection}
                      onChange={(e) => setMapProjection(e.target.value as MapProjection)}
                      className="hud-select min-w-0"
                    >
                      <option value="Mercator">Mercator</option>
                      <option value="NaturalEarth">Natural Earth</option>
                    </select>
                  </div>
                </div>

                {visitedNames.length > 0 && (
                  <div className="text-[11px] leading-relaxed text-slate-300">
                    Visited: <span className="break-words">{visitedNames.join(", ")}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {dupGuessIso && (
                    <div className="hud-toast hud-toast-info text-[11px]">
                      You’ve already visited <b>{nameOf(dupGuessIso)}</b>.
                    </div>
                  )}
                  {lastPickFailed && (
                    <div className="hud-toast hud-toast-warning text-[11px]">
                      <div className="font-medium mb-0.5">Couldn’t find a route</div>
                      <div className="opacity-90 mb-1">{lastPickMessage}</div>
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={relaxDifficulty} className="hud-mini-button">
                          Try easier
                        </button>
                        <button onClick={allowShorterPaths} className="hud-mini-button">
                          Allow shorter paths
                        </button>
                        <button onClick={clearPickStatus} className="hud-mini-button">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Win result card */}
      {won && (
        <ResultCard
          title="You made it!"
          summary={
            <>
              Path from <b>{nameOf(start)}</b> to <b>{nameOf(target)}</b> in{" "}
              <b>{moves + 1}</b> moves.
              {optimalHops != null && (
                <>
                  {" "}
                  (shortest path is <b>{optimalHops}</b> moves)
                </>
              )}
            </>
          }
          optimalPathNames={optimalPathNames}
          primaryActionLabel="Play again"
          onPrimaryAction={playAgain}
          minimized={resultCardMinimized}
          onToggleMinimized={() => setResultCardMinimized((value) => !value)}
        />
      )}

      {/* Lose result card */}
      {lost && (
        <ResultCard
          title="Out of hops!"
          summary={
            <>
              You used <b>{moves + 1}</b>
              {hopCap != null && (
                <>
                  {" "}
                  / <b>{hopCap}</b>
                </>
              )}{" "}
              hops and didn’t reach the target.
            </>
          }
          optimalPathNames={optimalPathNames}
          primaryActionLabel="Try a new route"
          onPrimaryAction={playAgain}
          minimized={resultCardMinimized}
          onToggleMinimized={() => setResultCardMinimized((value) => !value)}
        />
      )}
    </>
  );
}
