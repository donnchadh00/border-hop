import React from "react";
import clsx from "clsx";
import neighbours from "../data/neighbours.json";
import { useGame } from "../store/game";

type Props = {
  d: string | undefined;
  iso3: string | undefined;
  name?: string;
  interactive?: boolean;
};

const nbMap = neighbours as Record<string, readonly string[]>;

function CountryPathBase({ d, iso3, name, interactive = true }: Props) {
  const { current, start, target, visited, moveTo, focusIso, setFocus, hintTarget, mode } = useGame();

  const isVisited = !!(iso3 && visited.has(iso3 as any));
  const isCurrent = iso3 === current;
  const isFocused = iso3 === focusIso;
  const isHinted  = !!(iso3 && hintTarget && iso3 === hintTarget);
  const isStart   = iso3 && start && iso3 === start;
  const isTarget  = iso3 && target && iso3 === target;

  const canMove =
    interactive &&
    !!iso3 &&
    (!current || (nbMap[current]?.includes(iso3)));

  const outlineMode = mode === "Outline";

  const shouldHide =
    outlineMode &&
    !isVisited &&
    !isCurrent &&
    !isStart &&
    !isTarget;

  const baseFill =
    isCurrent ? "fill-emerald-400"
    : isVisited ? "fill-emerald-300"
    : outlineMode
      ? (isStart || isTarget ? "fill-transparent" : "fill-transparent")
      : "fill-slate-300 dark:fill-slate-700";

  const baseStroke =
    outlineMode
      ? (isStart
          ? "stroke-blue-500"
          : isTarget
            ? "stroke-amber-500"
            : "stroke-transparent")
      : "stroke-white/70 dark:stroke-black/50";

  const strokeWidth =
    outlineMode
      ? (isStart || isTarget ? "stroke-[1.5]" : "stroke-[0]")
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
        "focus:outline-none transition-[filter,fill] duration-150",
        isFocused && interactive && "ring-2 ring-offset-2 ring-blue-500",
        isHinted && "animate-pulse drop-shadow-[0_0_0.4rem_#fde047]",
        !outlineMode && (interactive && canMove ? "cursor-pointer hover:brightness-110" : ""),
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
  (prev, next) => prev.d === next.d && prev.iso3 === next.iso3 && prev.name === next.name
);
