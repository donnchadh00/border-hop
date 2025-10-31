import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { zoom as d3zoom, zoomIdentity, ZoomTransform } from "d3-zoom";
import { select } from "d3-selection";
import clsx from "clsx";
import neighbours from "../data/neighbours.json";
import { useGame } from "../store/game";
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";

type CountryFeature = Feature<Geometry, GeoJsonProperties>;
type CountryFC = FeatureCollection<Geometry, GeoJsonProperties>;

function isoOf(f: CountryFeature): string | undefined {
  const p = (f.properties || {}) as any;
  return p.ADM0_A3 || p.ISO_A3 || p.iso_a3 || (typeof f.id === "string" ? f.id : undefined);
}
function nameOf(f: CountryFeature): string | undefined {
  const p = (f.properties || {}) as any;
  return p.NAME || p.ADMIN || p.name || undefined;
}

export default function Map({ width = 1000, height = 600 }) {
  const { current, visited, moveTo, focusIso, setFocus, hintTarget } = useGame();
  const [fc, setFc] = useState<CountryFC | null>(null);

  // pan/zoom state
  const [tr, setTr] = useState<ZoomTransform>(zoomIdentity);
  const gRef = useRef<SVGGElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    fetch("/countries.geojson")
      .then((r) => r.json())
      .then((j) => setFc(j as CountryFC))
      .catch((e) => console.error("Failed to load countries.geojson", e));
  }, []);

  const projection = useMemo(
    () => geoMercator().fitSize([width, height], fc ?? { type: "FeatureCollection", features: [] }),
    [fc, width, height]
  );
  const path = useMemo(() => geoPath(projection), [projection]);

  // init d3-zoom
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    const z = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 8])
      .on("zoom", (event) => {
        setTr(event.transform);
      });
    svg.call(z as any);
    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-dvh">
      <rect x="0" y="0" width={width} height={height} className="fill-slate-200 dark:fill-slate-800" />
      <g ref={gRef} transform={`translate(${tr.x},${tr.y}) scale(${tr.k})`}>
        {fc?.features.map((f, i) => {
          const d = path(f as any) || undefined;
          const iso3 = isoOf(f);
          const isVisited = !!(iso3 && visited.has(iso3 as any));
          const isCurrent = iso3 === current;
          const isFocused = iso3 === focusIso;
          const isHinted = iso3 && hintTarget && iso3 === hintTarget;

          return (
            <path
              key={i}
              d={d}
              role="button"
              tabIndex={0}
              aria-label={`${nameOf(f) ?? "Country"} (${iso3 ?? "?"})`}
              className={clsx(
                "stroke-white/70 dark:stroke-black/50 stroke-[0.5] focus:outline-none",
                isCurrent && "fill-emerald-400",
                !isCurrent && isVisited && "fill-emerald-300",
                !isVisited && "fill-slate-300 dark:fill-slate-700",
                isFocused && "ring-2 ring-offset-2 ring-blue-500",
                isHinted && "animate-pulse drop-shadow-[0_0_0.35rem_#fde047]"
              )}
              onClick={() => {
                if (!iso3) return;
                if (!current || (neighbours as Record<string, readonly string[]>)[current]?.includes(iso3)) {
                  moveTo(iso3 as any);
                }
              }}
              onFocus={() => iso3 && setFocus(iso3 as any)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && iso3) {
                  e.preventDefault();
                  if (!current || (neighbours as Record<string, readonly string[]>)[current]?.includes(iso3)) {
                    moveTo(iso3 as any);
                  }
                }
              }}
            >
              <title>{`${iso3 ?? "?"} ${nameOf(f) ?? ""}`.trim()}</title>
            </path>
          );
        })}
      </g>
    </svg>
  );
}
