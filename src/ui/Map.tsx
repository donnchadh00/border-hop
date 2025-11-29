import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { zoom as d3zoom } from "d3-zoom";
import { select } from "d3-selection";
import { CountryPath } from "./CountryPath";
import { useGame } from "../store/game";
import type {
  FeatureCollection,
  Feature,
  Geometry,
  GeoJsonProperties,
} from "geojson";

type CountryFC = FeatureCollection<Geometry, GeoJsonProperties>;
type F = Feature<Geometry, GeoJsonProperties>;

// Helpers: property names vary between datasets
function isoFrom(props: any, id?: string | number) {
  return (
    props?.ADM0_A3 ||
    props?.ISO_A3 ||
    props?.iso_a3 ||
    (typeof id === "string" ? id : undefined)
  );
}
function nameFrom(props: any) {
  return props?.NAME || props?.ADMIN || props?.name || undefined;
}

export default function Map({ width = 1000, height = 600 }) {
  const [fc, setFc] = useState<CountryFC | null>(null);

  const gRef = useRef<SVGGElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const { start, target } = useGame();

  useEffect(() => {
    fetch("/countries.simplified.geojson")
      .then((r) => r.json())
      .then((j) => setFc(j as CountryFC))
      .catch((e) => console.error("Failed to load countries.geojson", e));
  }, []);

  const projection = useMemo(
    () =>
      geoMercator().fitSize(
        [width, height],
        fc ?? { type: "FeatureCollection", features: [] }
      ),
    [fc, width, height]
  );
  const path = useMemo(() => geoPath(projection), [projection]);

  // Imperative zoom: allow wheel/pinch and middle/right drag; left-click remains for selecting paths
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = select(svgRef.current);
    const g = select(gRef.current);

    let raf = 0;
    let pendingTransform: string | null = null;

    const zoomBehaviour = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 8])
      .filter((event: any) => {
        // Allow zoom for:
        // - wheel/pinch
        // - right button drag (button === 2)
        // - middle button drag (button === 1)
        // - modifier+drag (ctrl/cmd/shift)
        if (event.type === "wheel") return true;
        if (event.type === "mousedown" && (event.button === 1 || event.button === 2))
          return true;
        if (event.ctrlKey || event.metaKey || event.shiftKey) return true;
        // Otherwise (left button without modifiers): let clicks go to paths
        return false;
      })
      .on("zoom", (event) => {
        const t = event.transform.toString();
        if (raf) {
          pendingTransform = t;
          return;
        }
        g.attr("transform", t);
        raf = requestAnimationFrame(() => {
          if (pendingTransform) g.attr("transform", pendingTransform);
          pendingTransform = null;
          raf = 0;
        });
      });

    svg.call(zoomBehaviour as any);

    // Enable context menu again (right click)
    svg.on("contextmenu", null);

    return () => {
      svg.on(".zoom", null);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!fc || !start || !target || !gRef.current) return;

    const features = (fc.features as F[]).filter((f) => {
      const iso3 = isoFrom(f.properties, f.id);
      return iso3 === start || iso3 === target;
    });

    if (!features.length) return;

    const collection: CountryFC = {
      type: "FeatureCollection",
      features,
    };

    const [[x0, y0], [x1, y1]] = path.bounds(collection as any);
    const dx = x1 - x0 || 1;
    const dy = y1 - y0 || 1;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;

    const padding = 0.7;
    const maxScale = 8;

    const scale = Math.min(
      maxScale,
      padding * Math.min(width / dx, height / dy)
    );

    const translateX = width / 2 - scale * cx;
    const translateY = height / 2 - scale * cy;

    const transform = `translate(${translateX},${translateY}) scale(${scale})`;
    gRef.current.setAttribute("transform", transform);
  }, [fc, start, target, path, width, height]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-dvh bg-slate-950"
    >
      {/* Map background (ocean / world background) */}
      <rect
        x="0"
        y="0"
        width={width}
        height={height}
        className="fill-slate-900"
      />

      <g ref={gRef} transform="translate(0,0) scale(1)">
        {fc?.features.map((f, i) => {
          const d = path(f as any) || undefined;
          const iso3 = isoFrom(f.properties, f.id);
          const name = nameFrom(f.properties);
          return (
            <CountryPath
              key={i}
              d={d}
              iso3={iso3}
              name={name}
            />
          );
        })}
      </g>
    </svg>
  );
}
