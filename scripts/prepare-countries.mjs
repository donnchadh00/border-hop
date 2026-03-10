import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.resolve(__dirname, "../public/countries.geojson");
const OUTPUT = path.resolve(__dirname, "../public/countries.cleaned.geojson");

function rawNameFrom(p = {}) {
  return p.name || p.admin || p.name_en || p.formal_en || null;
}

function validIsoFrom(p = {}) {
  const candidates = [
    p.adm0_a3,
    p.adm0_iso,
    p.gu_a3,
    p.su_a3,
    p.brk_a3,
    p.iso_a3_eh,
    p.wb_a3,
    p.sov_a3,
    p.iso_a3,
  ];

  for (const cand of candidates) {
    if (!cand) continue;
    const code = String(cand).toUpperCase().trim();
    if (code === "-99") continue;
    if (!/^[A-Z]{3}$/.test(code)) continue;
    return code;
  }

  return null;
}

const NAME_TO_ISO3 = {
  France: "FRA",
  Norway: "NOR",
  Germany: "DEU",
  Spain: "ESP",
  Italy: "ITA",
  Ireland: "IRL",
  Portugal: "PRT",
  Belgium: "BEL",
  Netherlands: "NLD",
  Switzerland: "CHE",
  Austria: "AUT",
  Poland: "POL",
  Ukraine: "UKR",
  Sweden: "SWE",
  Finland: "FIN",
  Denmark: "DNK",
  Greece: "GRC",
  "United Kingdom": "GBR",
  Czechia: "CZE",
  "Czech Republic": "CZE",
  "Bosnia and Herzegovina": "BIH",
  "Bosnia and Herz.": "BIH",
  "North Macedonia": "MKD",
  Russia: "RUS",
  Belarus: "BLR",
  Lithuania: "LTU",
  Latvia: "LVA",
  Estonia: "EST",
  Turkey: "TUR",
  Georgia: "GEO",
  Armenia: "ARM",
  Azerbaijan: "AZE",
  Kazakhstan: "KAZ",
  China: "CHN",
  India: "IND",
  Pakistan: "PAK",
  Nepal: "NPL",
  Bhutan: "BTN",
  Myanmar: "MMR",
  Thailand: "THA",
  Laos: "LAO",
  Cambodia: "KHM",
  Vietnam: "VNM",
  Malaysia: "MYS",
  Indonesia: "IDN",
  Mongolia: "MNG",
  Somalia: "SOM",
  Kosovo: "XKX",
};

const ISO3_TO_NAME = {
  FRA: "France",
  NOR: "Norway",
  DEU: "Germany",
  ESP: "Spain",
  ITA: "Italy",
  IRL: "Ireland",
  GBR: "United Kingdom",
  CZE: "Czechia",
  BIH: "Bosnia and Herzegovina",
  MKD: "North Macedonia",
};

function gameNameFrom(rawName, iso3) {
  return ISO3_TO_NAME[iso3] || rawName;
}

const EXCLUDED_NAMES = new Set([
  "Baikonur",
  "Baikonur Cosmodrome",
  "Clipperton I.",
]);

const geo = JSON.parse(fs.readFileSync(INPUT, "utf-8"));

if (geo.type !== "FeatureCollection" || !Array.isArray(geo.features)) {
  throw new Error("Expected a GeoJSON FeatureCollection");
}

const seenIso = new Set();
const cleanedFeatures = [];

for (const feature of geo.features) {
  const props = feature.properties || {};
  const rawName = rawNameFrom(props);
  if (!rawName) continue;
  if (EXCLUDED_NAMES.has(rawName)) continue;

  const iso3 = validIsoFrom(props) || NAME_TO_ISO3[rawName];
  if (!iso3) continue;

  if (seenIso.has(iso3)) continue;
  seenIso.add(iso3);

  cleanedFeatures.push({
    ...feature,
    properties: {
      ...props,
      GAME_ISO3: iso3,
      GAME_NAME: gameNameFrom(rawName, iso3),
    },
  });
}

const out = {
  type: "FeatureCollection",
  features: cleanedFeatures,
};

fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUTPUT} with ${cleanedFeatures.length} countries`);
