import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection, Feature, Geometry, GeoJsonProperties } from "geojson";
import { countryIso3From, countryNameFrom } from "./countries";

type FC = FeatureCollection<Geometry, GeoJsonProperties>;
type F = Feature<Geometry, GeoJsonProperties>;

export function useCountryNames(source = "/countries.cleaned.simplified.geojson") {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    fetch(source)
      .then((r) => r.json())
      .then((fc: FC) => {
        if (!alive) return;
        const m: Record<string, string> = {};
        for (const f of fc.features as F[]) {
          const iso = countryIso3From(f.properties);
          const name = countryNameFrom(f.properties);
          if (iso && name) m[iso] = name;
        }
        setMap(m);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [source]);

  const nameOf = useMemo(
    () => (iso?: string | null) => (iso ? map[iso] ?? iso : "-"),
    [map]
  );

  return { names: map, nameOf };
}
