import React from "react";
import clsx from "clsx";
import neighbours from "../data/neighbours.json";
import { useGame } from "../store/game";

type Props = {
  d: string | undefined;
  iso3: string | undefined;
  name?: string;
};

const nbMap = neighbours as Record<string, readonly string[]>;

function CountryPathBase({ d, iso3, name }: Props) {
  const { current, visited, moveTo, focusIso, setFocus, hintTarget } = useGame();

  const isVisited = !!(iso3 && visited.has(iso3 as any));
  const isCurrent = iso3 === current;
  const isFocused = iso3 === focusIso;
  const isHinted = iso3 && hintTarget && iso3 === hintTarget;

  const canMove =
    !!iso3 &&
    (!current || (nbMap[current]?.includes(iso3)));

  return (
    <path
      d={d}
      role="button"
      tabIndex={0}
      aria-label={`${name ?? "Country"} (${iso3 ?? "?"})`}
      className={clsx(
        "stroke-white/70 dark:stroke-black/50 stroke-[0.5] focus:outline-none transition-[filter,fill] duration-150",
        isCurrent && "fill-emerald-400",
        !isCurrent && isVisited && "fill-emerald-300",
        !isVisited && "fill-slate-300 dark:fill-slate-700",
        isFocused && "ring-2 ring-offset-2 ring-blue-500",
        isHinted && "animate-pulse drop-shadow-[0_0_0.4rem_#fde047]",
        canMove ? "cursor-pointer hover:brightness-110" : "cursor-not-allowed opacity-70"
      )}
      onClick={() => {
        if (iso3 && canMove) moveTo(iso3 as any);
      }}
      onFocus={() => iso3 && setFocus(iso3 as any)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && iso3 && canMove) {
          e.preventDefault();
          moveTo(iso3 as any);
        }
      }}
    >
      <title>{`${iso3 ?? "?"} ${name ?? ""}`.trim()}</title>
    </path>
  );
}

export const CountryPath = React.memo(
  CountryPathBase,
  (prev, next) => prev.d === next.d && prev.iso3 === next.iso3 && prev.name === next.name
);
