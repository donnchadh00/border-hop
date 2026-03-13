import { useEffect, useMemo, useRef, useState } from "react";
import {
  geoMercator,
  geoNaturalEarth1,
  geoOrthographic,
  geoPath,
  geoGraticule,
} from "d3-geo";
import { zoom as d3zoom, zoomIdentity } from "d3-zoom";
import { select } from "d3-selection";
import { CountryPath } from "./CountryPath";
import { useGame } from "../store/game";
import { countryIso3From, countryNameFrom } from "../lib/countries";
import type {
  FeatureCollection,
  Feature,
  Geometry,
  GeoJsonProperties,
} from "geojson";

type CountryFC = FeatureCollection<Geometry, GeoJsonProperties>;
type F = Feature<Geometry, GeoJsonProperties>;

export default function Map({ width = 1000, height = 600 }) {
  const [fc, setFc] = useState<CountryFC | null>(null);

  const gRef = useRef<SVGGElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<ReturnType<typeof d3zoom<SVGSVGElement, unknown>> | null>(null);

  const { start, target, mapProjection } = useGame();

  useEffect(() => {
    fetch("/countries.cleaned.simplified.geojson")
      .then((r) => r.json())
      .then((j) => setFc(j as CountryFC))
      .catch((e) => console.error("Failed to load countries.cleaned.simplified.geojson", e));
  }, []);

  const projection = useMemo(() => {
    const empty = fc ?? { type: "FeatureCollection", features: [] };

    switch (mapProjection) {
      case "NaturalEarth":
        return geoNaturalEarth1().fitSize([width, height], empty);
      case "Orthographic":
        return geoOrthographic().fitSize([width, height], empty);
      case "Mercator":
      default:
        return geoMercator().fitSize([width, height], empty);
    }
  }, [fc, width, height, mapProjection]);

  const path = useMemo(() => geoPath(projection), [projection]);

  const graticulePath = useMemo(() => {
    const graticule = geoGraticule();
    return path(graticule());
  }, [path]);

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
        if (
          event.type === "mousedown" &&
          (event.button === 0 || event.button === 1 || event.button === 2)
        ) {
          return true;
        }
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

    zoomRef.current = zoomBehaviour;
    svg.call(zoomBehaviour as any);

    // Enable context menu again (right click)
    svg.on("contextmenu", null);

    return () => {
      svg.on(".zoom", null);
      zoomRef.current = null;
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!fc || !start || !target || !svgRef.current || !zoomRef.current) return;

    const features = (fc.features as F[]).filter((f) => {
      const iso3 = countryIso3From(f.properties, f.id);
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

    const hudHeight = 80;
    const effectiveHeight = Math.max(1, height - hudHeight);

    const padding = 0.7;
    const maxScale = 8;

    const scale = Math.min(
      maxScale,
      padding * Math.min(width / dx, effectiveHeight / dy)
    );

    const visibleCenterY = hudHeight / 2 + effectiveHeight / 2;
    const visibleCenterX = width / 2;

    const translateX = visibleCenterX - scale * cx;
    const translateY = visibleCenterY - scale * cy;

    const t = zoomIdentity.translate(translateX, translateY).scale(scale);

    const svgSelection = select(svgRef.current);
    svgSelection.call(zoomRef.current.transform as any, t);
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
        className="fill-sky-950"
      />

      <g ref={gRef} transform="translate(0,0) scale(1)">
        {graticulePath && (
          <path
            d={graticulePath}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={0.6}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}

        {fc?.features.map((f, i) => {
          const d = path(f as any) || undefined;
          const iso3 = countryIso3From(f.properties, f.id);
          const name = countryNameFrom(f.properties);
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
