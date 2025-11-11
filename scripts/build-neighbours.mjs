import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { topology } from "topojson-server";
import { neighbors as topoNeighbors } from "topojson-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.resolve(__dirname, "../public/countries.geojson");
const OUTPUT = path.resolve(__dirname, "../src/data/neighbours.json");
const OBJ = "countries";

const geo = JSON.parse(fs.readFileSync(INPUT, "utf-8"));

// Prefer a sovereign code when available; fall back to ISO/ADM props.
// Reject -99 and non-3-letter codes.
function getCode(p = {}) {
  const cand =
    p.SOV_A3 || p.ISO_A3_EH || p.ADM0_A3 || p.ISO_A3 || p.WB_A3 || p.iso_a3 || null;
  if (!cand) return null;
  const code = String(cand).toUpperCase();
  if (code === "-99") return null;
  if (!/^[A-Z]{3}$/.test(code)) return null;
  return code;
}

// Build topology
const topo = topology({ [OBJ]: geo });

// Geometries & a mapping from geometry index -> final ISO3 (or null to skip)
const geoms = topo.objects[OBJ].geometries;
const codeByIndex = geoms.map((g) => getCode(g.properties));

// Compute neighbours by geometry index
const idxNeighbours = topoNeighbors(geoms);

// Build ISO3 -> neighbours (ISO3) with filtering, de-dup, and self-removal
const neighbours = {};
for (let i = 0; i < idxNeighbours.length; i++) {
  const me = codeByIndex[i];
  if (!me) continue;

  // ensure container exists
  neighbours[me] ||= [];

  for (const j of idxNeighbours[i]) {
    const nb = codeByIndex[j];
    if (!nb || nb === me) continue;
    neighbours[me].push(nb);
  }

  // de-dup
  neighbours[me] = Array.from(new Set(neighbours[me]));
}

// Ensure reciprocity
for (const [a, list] of Object.entries(neighbours)) {
  for (const b of list) {
    neighbours[b] ||= [];
    if (!neighbours[b].includes(a)) neighbours[b].push(a);
  }
}

// Save
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(neighbours, null, 2));
console.log(`Wrote ${OUTPUT} (${Object.keys(neighbours).length} countries)`);
