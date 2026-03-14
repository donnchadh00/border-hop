import React from "react";
import clsx from "clsx";
import { useGame } from "../store/game";
import { isOutlineMode, type ISO3 } from "../game/modes";

type Props = {
  d: string | undefined;
  iso3: string | undefined;
  name?: string;
  interactive?: boolean;
  revealStep?: number | null;
};

function CountryPathBase({
  d,
  iso3,
  name,
  interactive = true,
  revealStep = null,
}: Props) {
  const {
    current,
    start,
    target,
    visited,
    moveTo,
    focusIso,
    setFocus,
    hintTarget,
    mode,
  } = useGame();
  const countryIso = iso3 as ISO3 | undefined;

  const isVisited = !!(countryIso && visited.has(countryIso));
  const isCurrent = iso3 === current;
  const isFocused = iso3 === focusIso;
  const isHinted = !!(iso3 && hintTarget && iso3 === hintTarget);
  const isStart = !!(iso3 && start && iso3 === start);
  const isTarget = !!(iso3 && target && iso3 === target);
  const isRevealed = revealStep != null && !isVisited && !isStart && !isTarget;

  const canMove = interactive && !!iso3;
  const outlineMode = isOutlineMode(mode);

  const shouldHide =
    outlineMode &&
    !isVisited &&
    !isCurrent &&
    !isStart &&
    !isTarget &&
    !isRevealed &&
    !isHinted;

  const baseFill = isStart
    ? "fill-emerald-500"
    : isTarget
    ? "fill-rose-500"
    : isCurrent
    ? "fill-emerald-400"
    : isHinted && outlineMode
    ? "fill-yellow-300/35"
    : isRevealed
    ? "fill-transparent"
    : isVisited
    ? "fill-emerald-300"
    : outlineMode
    ? "fill-transparent"
    : "fill-slate-300 dark:fill-slate-800";

  const baseStroke = isStart
    ? "stroke-emerald-200"
    : isTarget
    ? "stroke-rose-200"
    : isHinted && outlineMode
    ? "stroke-yellow-300"
    : isRevealed
    ? "stroke-sky-200/60"
    : outlineMode
    ? "stroke-slate-900 dark:stroke-slate-200"
    : "stroke-slate-900";

  const strokeWidth =
    isStart || isTarget
      ? "stroke-[1.5]"
    : isHinted && outlineMode
      ? "stroke-[1.8]"
      : isRevealed
      ? "stroke-[0.9]"
      : outlineMode
      ? "stroke-[0.75]"
      : "stroke-[0.5]";

  return (
    <path
      d={d}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={`${name ?? "Country"} (${iso3 ?? "?"})`}
      className={clsx(
        baseFill,
        baseStroke,
        strokeWidth,
        "focus:outline-none transition-[fill,stroke,opacity] duration-200",
        isFocused && interactive && "ring-2 ring-offset-2 ring-blue-500",
        isHinted && "animate-pulse drop-shadow-[0_0_0.45rem_#fde047]",
        !outlineMode &&
          (interactive && canMove ? "cursor-pointer hover:brightness-110" : ""),
        shouldHide && "opacity-0 pointer-events-none"
      )}
      style={isRevealed ? { transitionDelay: `${revealStep * 28}ms` } : undefined}
      onClick={
        !interactive
          ? undefined
          : () => {
              if (countryIso && canMove) moveTo(countryIso);
            }
      }
      onFocus={!interactive ? undefined : () => countryIso && setFocus(countryIso)}
      onKeyDown={
        !interactive
          ? undefined
          : (e) => {
              if (e.key === "Enter" && countryIso && canMove) {
                e.preventDefault();
                moveTo(countryIso);
              }
            }
      }
      vectorEffect="non-scaling-stroke"
      shapeRendering="optimizeSpeed"
    >
      <title>{`${name ?? ""} (${iso3 ?? "?"})`.trim()}</title>
    </path>
  );
}

export const CountryPath = React.memo(
  CountryPathBase,
  (prev, next) =>
    prev.d === next.d &&
    prev.iso3 === next.iso3 &&
    prev.name === next.name &&
    prev.revealStep === next.revealStep
);
