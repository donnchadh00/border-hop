import { useEffect, useMemo, useRef, useState } from "react";
import { useGame } from "../store/game";
import type { FeatureCollection, Feature, Geometry, GeoJsonProperties } from "geojson";

type FC = FeatureCollection<Geometry, GeoJsonProperties>;
type F = Feature<Geometry, GeoJsonProperties>;
type Country = { iso3: string; name: string };

function isoFrom(props: any, id?: string | number) {
  return props?.ADM0_A3 || props?.ISO_A3 || props?.iso_a3 || (typeof id === "string" ? id : undefined);
}
function nameFrom(props: any) {
  return props?.NAME || props?.ADMIN || props?.name || "";
}
function normalise(s: string) {
  return s.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export default function CountrySearch({
  source = "/countries.geojson",
  placeholder = "Type a country…",
  allowedIso3,
}: {
  source?: string;
  placeholder?: string;
  allowedIso3?: readonly string[];
}) {
  const { moveTo } = useGame();
  const [all, setAll] = useState<Country[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch(source)
      .then((r) => r.json())
      .then((fc: FC) => {
        const seen = new Set<string>();
        const rows: Country[] = [];

        const allowedSet = allowedIso3
          ? new Set(allowedIso3.map((c) => c.toUpperCase()))
          : null;

        for (const f of fc.features as F[]) {
          const iso3 = isoFrom(f.properties, f.id);
          if (!iso3 || seen.has(iso3)) continue;

          if (allowedSet && !allowedSet.has(iso3.toUpperCase())) continue;

          seen.add(iso3);
          rows.push({ iso3, name: nameFrom(f.properties) || iso3 });
        }
        rows.sort((a, b) => a.name.localeCompare(b.name));
        setAll(rows);
      })
      .catch((e) => console.error("Failed to load countries for search:", e));
  }, [source, allowedIso3]);

  const filtered = useMemo(() => {
    if (!q) return all.slice(0, 50);
    const nq = normalise(q);
    const hits = all
      .map((c) => {
        const nameHit = normalise(c.name).includes(nq);
        const isoHit = normalise(c.iso3).startsWith(nq);
        return { c, score: nameHit || isoHit ? 0 : 1 };
      })
      .filter((h) => h.score === 0)
      .slice(0, 50)
      .map((h) => h.c);
    return hits.length ? hits : [];
  }, [q, all]);

  useEffect(() => {
    setActive(0);
  }, [q, filtered.length]);

  function tryMove(iso3: string) {
    moveTo(iso3 as any);
    setQ("");
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!filtered.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
      scrollActiveIntoView();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      scrollActiveIntoView();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = filtered[active];
      if (pick) tryMove(pick.iso3);
    } else if (e.key === "Escape") {
      setQ("");
    }
  }

  function scrollActiveIntoView() {
    const ul = listRef.current;
    if (!ul) return;
    const li = ul.children[active] as HTMLElement | undefined;
    if (li) li.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm opacity-80">Jump to any country</label>
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-[min(92vw,28rem)] px-3 py-2 rounded-lg border bg-white/70 dark:bg-slate-800"
        aria-autocomplete="list"
        aria-controls="country-suggest"
      />

      {q && (
        <ul
          id="country-suggest"
          ref={listRef}
          className="max-h-60 overflow-auto rounded-lg border bg-white dark:bg-slate-900 shadow"
          role="listbox"
        >
          {filtered.length ? (
            filtered.map((c, i) => (
              <li
                key={c.iso3}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); tryMove(c.iso3); }}
                onMouseEnter={() => setActive(i)}
                className={`px-3 py-2 cursor-pointer ${i === active ? "bg-slate-100 dark:bg-slate-800" : ""}`}
              >
                <span className="font-medium">{c.name}</span>
                <span className="opacity-60 ml-2 text-xs">{c.iso3}</span>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 opacity-60">No matches</li>
          )}
        </ul>
      )}
    </div>
  );
}
