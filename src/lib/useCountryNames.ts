import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection, Feature, Geometry, GeoJsonProperties } from "geojson";

type FC = FeatureCollection<Geometry, GeoJsonProperties>;
type F = Feature<Geometry, GeoJsonProperties>;

function isoFrom(props: any, id?: string | number) {
  const candidates = [
    props?.adm0_a3,
    props?.adm0_iso,
    props?.gu_a3,
    props?.su_a3,
    props?.brk_a3,
    props?.iso_a3_eh,
    props?.wb_a3,
    props?.sov_a3,
    props?.iso_a3,
    typeof id === "string" ? id : null,
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    const code = String(cand).toUpperCase().trim();
    if (code === "-99") continue;
    if (!/^[A-Z]{3}$/.test(code)) continue;
    return code;
  }

  return undefined;
}

function nameFrom(props: any) {
  return props?.name || props?.admin || props?.name_en || props?.formal_en || "Unknown";
}

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
          const iso = isoFrom(f.properties);
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
