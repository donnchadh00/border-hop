import React from "react";
import clsx from "clsx";
import { useGame } from "../store/game";
import { isOutlineMode } from "../game/modes";

type Props = {
  d: string | undefined;
  iso3: string | undefined;
  name?: string;
  interactive?: boolean;
};

function CountryPathBase({ d, iso3, name, interactive = true }: Props) {
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

  const isVisited = !!(iso3 && visited.has(iso3 as any));
  const isCurrent = iso3 === current;
  const isFocused = iso3 === focusIso;
  const isHinted = !!(iso3 && hintTarget && iso3 === hintTarget);
  const isStart = !!(iso3 && start && iso3 === start);
  const isTarget = !!(iso3 && target && iso3 === target);

  const canMove = interactive && !!iso3;
  const outlineMode = isOutlineMode(mode);

  const shouldHide =
    outlineMode &&
    !isVisited &&
    !isCurrent &&
    !isStart &&
    !isTarget &&
    !isHinted;

  const baseFill = isStart
    ? "fill-emerald-500"
    : isTarget
    ? "fill-rose-500"
    : isCurrent
    ? "fill-emerald-400"
    : isHinted && outlineMode
    ? "fill-yellow-300/35"
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
    : outlineMode
    ? "stroke-slate-900 dark:stroke-slate-200"
    : "stroke-slate-900";

  const strokeWidth =
    isStart || isTarget
      ? "stroke-[1.5]"
      : isHinted && outlineMode
      ? "stroke-[1.8]"
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
        "focus:outline-none transition-[filter,fill,stroke,opacity] duration-150",
        isFocused && interactive && "ring-2 ring-offset-2 ring-blue-500",
        isHinted && "animate-pulse drop-shadow-[0_0_0.45rem_#fde047]",
        !outlineMode &&
          (interactive && canMove ? "cursor-pointer hover:brightness-110" : ""),
        shouldHide && "opacity-0 pointer-events-none"
      )}
      onClick={
        !interactive
          ? undefined
          : () => {
              if (iso3 && canMove) moveTo(iso3 as any);
            }
      }
      onFocus={!interactive ? undefined : () => iso3 && setFocus(iso3 as any)}
      onKeyDown={
        !interactive
          ? undefined
          : (e) => {
              if (e.key === "Enter" && iso3 && canMove) {
                e.preventDefault();
                moveTo(iso3 as any);
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
    prev.d === next.d && prev.iso3 === next.iso3 && prev.name === next.name
);
