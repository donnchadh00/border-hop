import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection, Feature, Geometry, GeoJsonProperties } from "geojson";

type FC = FeatureCollection<Geometry, GeoJsonProperties>;
type F = Feature<Geometry, GeoJsonProperties>;

function isoFrom(props: any, id?: string | number) {
  return props?.ADM0_A3 || props?.ISO_A3 || props?.iso_a3 || (typeof id === "string" ? id : undefined);
}
function nameFrom(props: any) {
  return props?.NAME || props?.ADMIN || props?.name || "";
}

export function useCountryNames(source = "/countries.geojson") {
  const [map, setMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    fetch(source)
      .then((r) => r.json())
      .then((fc: FC) => {
        if (!alive) return;
        const m: Record<string, string> = {};
        for (const f of fc.features as F[]) {
          const iso = isoFrom(f.properties, f.id);
          const name = nameFrom(f.properties);
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
