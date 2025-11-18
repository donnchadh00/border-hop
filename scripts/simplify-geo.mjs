import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { topology } from "topojson-server";
import { feature } from "topojson-client";
import { presimplify, simplify, quantile } from "topojson-simplify";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputArg = process.argv[2] ?? "../public/countries.geojson";
const IN = path.resolve(__dirname, inputArg);

const inputBase = path.basename(IN);
const baseName = inputBase
  .replace(/\.geo\.json$/i, "")
  .replace(/\.geojson$/i, "")
  .replace(/\.json$/i, "");

const OUT = path.resolve(__dirname, `../public/${baseName}.simplified.geojson`);

const OBJECT_NAME = "countries";

const fc = JSON.parse(fs.readFileSync(IN, "utf-8"));
let topo = topology({ [OBJECT_NAME]: fc });
topo = presimplify(topo);
const threshold = quantile(topo, 0.05);
topo = simplify(topo, threshold);
const simplifiedFC = feature(topo, topo.objects[OBJECT_NAME]);
fs.writeFileSync(OUT, JSON.stringify(simplifiedFC));
console.log(`From ${IN} wrote ${OUT}`);
