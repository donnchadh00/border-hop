import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as topojson from "topojson-server";
import { neighbors as topoNeighbors } from "topojson-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.resolve(__dirname, "../public/countries.geojson");
const OUTPUT = path.resolve(__dirname, "../src/data/neighbours.json");

// 1) Load GeoJSON
const geo = JSON.parse(fs.readFileSync(INPUT, "utf-8"));

// 2) Build a Topology so we can use topojson-client.neighbors
// Expect a FeatureCollection of countries.
const objectName = "countries";
const topology = topojson.topology({ [objectName]: geo }, { "property-transform": (p) => p });

// 3) Compute neighbour indices for each geometry
const geoms = topology.objects[objectName].geometries;
const neighIdx = topoNeighbors(geoms); // array of arrays of integer indices

// 4) Map indices -> ISO3, infer property name robustly
function getISO3(props = {}) {
  return props.ADM0_A3 || props.ISO_A3 || props.iso_a3 || props.ADM0_A3_US || null;
}
const iso3ByIndex = geoms.map((g) => getISO3(g.properties));

const neighbours = {};
for (let i = 0; i < neighIdx.length; i++) {
  const me = iso3ByIndex[i];
  if (!me) continue;
  neighbours[me] = neighIdx[i]
    .map((j) => iso3ByIndex[j])
    .filter(Boolean)
    // Deduplicate and drop self, just in case
    .filter((x, idx, arr) => x !== me && arr.indexOf(x) === idx);
}

// 5) Save as JSON
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(neighbours, null, 2));
console.log(`Wrote ${OUTPUT} (${Object.keys(neighbours).length} countries)`);
