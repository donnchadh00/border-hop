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
import neighbours from "../data/neighbours.json";
import type { ISO3 } from "../game/modes";
import type {
  FeatureCollection,
  Feature,
  Geometry,
  GeoJsonProperties,
} from "geojson";

type CountryFC = FeatureCollection<Geometry, GeoJsonProperties>;
type F = Feature<Geometry, GeoJsonProperties>;
type ZoomFilterEvent = MouseEvent | WheelEvent | TouchEvent;
type RevealStepMap = Partial<Record<ISO3, number>>;

const NB = neighbours as Record<ISO3, readonly ISO3[]>;

function isWinningPosition(
  startIso: ISO3 | null,
  targetIso: ISO3 | null,
  visited: Set<ISO3>
): boolean {
  if (!startIso || !targetIso) return false;
  if (!visited.has(startIso)) return false;

  const candidates: ISO3[] = [];
  if (visited.has(targetIso)) candidates.push(targetIso);

  for (const nb of NB[targetIso] ?? []) {
    if (visited.has(nb)) candidates.push(nb);
  }

  if (candidates.length === 0) return false;

  const queue: ISO3[] = [startIso];
  const seen = new Set<ISO3>([startIso]);

  while (queue.length) {
    const cur = queue.shift()!;

    if (candidates.includes(cur)) return true;

    for (const nb of NB[cur] ?? []) {
      if (!visited.has(nb) || seen.has(nb)) continue;
      seen.add(nb);
      queue.push(nb);
    }
  }

  return false;
}

function buildRevealLayers(targetIso: ISO3, maxDepth = 4): ISO3[][] {
  const queue: Array<{ iso: ISO3; depth: number }> = [{ iso: targetIso, depth: 0 }];
  const seen = new Set<ISO3>([targetIso]);
  const layers: ISO3[][] = [];

  while (queue.length) {
    const { iso, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    for (const nb of NB[iso] ?? []) {
      if (seen.has(nb)) continue;
      seen.add(nb);

      const nextDepth = depth + 1;
      if (!layers[nextDepth - 1]) layers[nextDepth - 1] = [];
      layers[nextDepth - 1].push(nb);
      queue.push({ iso: nb, depth: nextDepth });
    }
  }

  return layers;
}

function buildGlobalRevealLayers(
  targetIso: ISO3,
  features: F[],
  path: ReturnType<typeof geoPath>,
  maxDepth = 4,
  fallbackWaveCount = 4
): ISO3[][] {
  const layers = buildRevealLayers(targetIso, maxDepth);
  const revealed = new Set<ISO3>([targetIso]);

  for (const layer of layers) {
    for (const iso of layer) revealed.add(iso);
  }

  const targetFeature = features.find(
    (feature) => countryIso3From(feature.properties, feature.id) === targetIso
  );
  const targetCentroid = targetFeature
    ? path.centroid(targetFeature as GeoPermissibleObjects)
    : null;

  if (
    !targetCentroid ||
    !Number.isFinite(targetCentroid[0]) ||
    !Number.isFinite(targetCentroid[1])
  ) {
    return layers;
  }

  const fallbackCandidates = features
    .map((feature) => {
      const iso = countryIso3From(feature.properties, feature.id) as ISO3 | undefined;
      if (!iso || revealed.has(iso)) return null;

      const [x, y] = path.centroid(feature as GeoPermissibleObjects);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

      const dx = x - targetCentroid[0];
      const dy = y - targetCentroid[1];
      return { iso, distanceSq: dx * dx + dy * dy };
    })
    .filter((candidate): candidate is { iso: ISO3; distanceSq: number } => candidate != null)
    .sort((a, b) => a.distanceSq - b.distanceSq);

  if (!fallbackCandidates.length) return layers;

  const chunkSize = Math.max(
    1,
    Math.ceil(fallbackCandidates.length / fallbackWaveCount)
  );

  fallbackCandidates.forEach((candidate, index) => {
    const waveIndex = maxDepth + Math.floor(index / chunkSize);
    if (!layers[waveIndex]) layers[waveIndex] = [];
    layers[waveIndex].push(candidate.iso);
  });

  return layers;
}

export default function Map({ width = 1000, height = 600 }) {
  const [fc, setFc] = useState<CountryFC | null>(null);
  const [revealSteps, setRevealSteps] = useState<RevealStepMap>({});

  const gRef = useRef<SVGGElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomRef = useRef<ReturnType<typeof d3zoom<SVGSVGElement, unknown>> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);

  const { start, target, visited, failed, mapProjection, mode } = useGame();
  const won = isWinningPosition(start, target, visited);
  const gameOver = !!target && mode !== "Practice" && (won || failed);

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

  useEffect(() => {
    if (!gameOver || !target) {
      setRevealSteps({});
      return;
    }

    const layers = fc
      ? buildGlobalRevealLayers(target, fc.features as F[], path, 5, 5)
      : buildRevealLayers(target, 5);
    const orderedCountries = layers.flat();
    const timeouts = orderedCountries.map((iso, index) =>
      window.setTimeout(() => {
        setRevealSteps((prev) => ({
          ...prev,
          [iso]: index,
        }));
      }, 40 + index * 18)
    );

    return () => {
      for (const timeoutId of timeouts) window.clearTimeout(timeoutId);
    };
  }, [fc, gameOver, path, target]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="block h-dvh w-full bg-slate-950"
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
              revealStep={iso3 ? revealSteps[iso3 as ISO3] ?? null : null}
            />
          );
        })}
      </g>
    </svg>
  );
}
