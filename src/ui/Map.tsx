import { useEffect, useMemo, useRef, useState } from "react";
import {
  type GeoPermissibleObjects,
  geoMercator,
  geoNaturalEarth1,
  geoOrthographic,
  geoPath,
  geoGraticule,
} from "d3-geo";
import {
  zoom as d3zoom,
  zoomIdentity,
  type D3ZoomEvent,
  type ZoomTransform,
} from "d3-zoom";
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
type ZoomFilterEvent = MouseEvent | WheelEvent | TouchEvent;

export default function Map({ width = 1000, height = 600 }) {
  const [fc, setFc] = useState<CountryFC | null>(null);

  const gRef = useRef<SVGGElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<ReturnType<typeof d3zoom<SVGSVGElement, unknown>> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);

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

  const translateExtent = useMemo<[[number, number], [number, number]]>(() => {
    if (!fc) return [[0, 0], [width, height]];

    const [[x0, y0], [x1, y1]] = path.bounds(
      fc as GeoPermissibleObjects
    );

    const horizontalPadding = Math.max(120, width * 0.2);
    const verticalPadding = Math.max(80, height * 0.18);

    return [
      [x0 - horizontalPadding, y0 - verticalPadding],
      [x1 + horizontalPadding, y1 + verticalPadding],
    ];
  }, [fc, path, width, height]);

  // Imperative zoom: allow wheel/pinch and middle/right drag; left-click remains for selecting paths
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = select(svgRef.current);
    const g = select(gRef.current);

    let raf = 0;
    let pendingTransform: string | null = null;

    const zoomBehaviour = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 8])
      .extent([[0, 0], [width, height]])
      .translateExtent(translateExtent)
      .filter((event: ZoomFilterEvent) => {
        // Allow zoom for:
        // - wheel/pinch
        // - right button drag (button === 2)
        // - middle button drag (button === 1)
        // - modifier+drag (ctrl/cmd/shift)
        if (event.type === "wheel") return true;
        if (event instanceof MouseEvent && event.type === "mousedown") {
          if (
            event.button === 0 ||
            event.button === 1 ||
            event.button === 2
          ) {
            return true;
          }
        }
        if (
          "ctrlKey" in event &&
          "metaKey" in event &&
          "shiftKey" in event &&
          (event.ctrlKey || event.metaKey || event.shiftKey)
        ) {
          return true;
        }
        // Otherwise (left button without modifiers): let clicks go to paths
        return false;
      })
      .on("zoom", (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        transformRef.current = event.transform;
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
    svg.call(zoomBehaviour);
    svg.call(zoomBehaviour.transform, transformRef.current);

    // Enable context menu again (right click)
    svg.on("contextmenu", null);

    return () => {
      svg.on(".zoom", null);
      zoomRef.current = null;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [height, translateExtent, width]);

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

    const [[x0, y0], [x1, y1]] = path.bounds(
      collection as GeoPermissibleObjects
    );
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
    transformRef.current = t;

    const svgSelection = select(svgRef.current);
    svgSelection.call(zoomRef.current.transform, t);
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
          const d = path(f as GeoPermissibleObjects) || undefined;
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
