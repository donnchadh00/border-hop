import fs from "node:fs";

const geo = JSON.parse(fs.readFileSync("./public/countries.geojson", "utf-8"));

function nameFrom(p = {}) {
  return p.name || p.admin || p.name_en || p.formal_en || null;
}

function isoCandidates(p = {}) {
  return [
    p.adm0_a3,
    p.adm0_iso,
    p.gu_a3,
    p.su_a3,
    p.brk_a3,
    p.iso_a3_eh,
    p.wb_a3,
    p.sov_a3,
    p.iso_a3,
  ].filter(Boolean);
}

for (const f of geo.features) {
  const p = f.properties || {};
  const name = nameFrom(p);

  if (name === "France" || name === "Norway") {
    console.log("----");
    console.log("Country:", name);
    console.log("ISO candidates:", isoCandidates(p));
    console.log("Properties:", p);
  }
}
