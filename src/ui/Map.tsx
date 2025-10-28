import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import clsx from "clsx";
import { useGame } from "../store/game";
import neighbours from "../data/neighbours.json";

type FeatureProps = Record<string, unknown>;
type Feature = {
  type: "Feature";
  id?: string | number;
  properties: FeatureProps;
  geometry: GeoJSON.Geometry;
};
type FeatureCollection = { type: "FeatureCollection"; features: Feature[] };

function isoOf(f: Feature): string | undefined {
  const p = f.properties || {};
  return (p as any).ADM0_A3 || (p as any).ISO_A3 || (p as any).iso_a3 || (typeof f.id === "string" ? f.id : undefined);
}

export default function Map({ width = 1000, height = 600 }) {
  const { current, visited, moveTo } = useGame();
  const [fc, setFc] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    fetch("/countries.geojson")
      .then((r) => r.json())
      .then((j) => setFc(j as FeatureCollection))
      .catch((e) => console.error("Failed to load countries.geojson", e));
  }, []);

  const projection = useMemo(
    () => geoMercator().fitSize([width, height], fc ?? { type: "FeatureCollection", features: [] }),
    [fc, width, height]
  );
  const path = useMemo(() => geoPath(projection), [projection]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-dvh">
      <rect x="0" y="0" width={width} height={height} className="fill-slate-200 dark:fill-slate-800" />
      {fc?.features.map((f, i) => {
        const d = path(f as any) || undefined;
        const iso3 = isoOf(f);
        const isVisited = !!(iso3 && visited.has(iso3 as any));
        const isCurrent = iso3 === current;
        return (
          <path
            key={i}
            d={d}
            className={clsx(
              "stroke-white/70 dark:stroke-black/50 stroke-[0.5]",
              isCurrent && "fill-emerald-400",
              !isCurrent && isVisited && "fill-emerald-300",
              !isVisited && "fill-slate-300 dark:fill-slate-700",
              "transition-all duration-200 hover:brightness-110 cursor-pointer"
            )}
            onClick={() => {
              if (!iso3) return;
              // first click allowed; afterwards must be a neighbour
              if (!current || (neighbours as Record<string, readonly string[]>)[current]?.includes(iso3)) {
                moveTo(iso3 as any);
              }
            }}
          >
            <title>{iso3}</title>
          </path>
        );
      })}
    </svg>
  );
}
