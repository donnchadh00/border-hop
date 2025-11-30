import neighbours from "../data/neighbours.json";
export type ISO3 = keyof typeof neighbours;

export type GameMode = "Practice" | "Europe" | "Time Trial" | "World";

// A Europe subset (refine later)
export const EUROPE: readonly ISO3[] = [
  "ALB","AND","AUT","BEL","BIH","BGR","BLR","CHE","CZE","DEU","DNK","ESP",
  "EST","FIN","FRA","GBR","GRC","HRV","HUN","IRL","ISL","ITA","LIE","LTU",
  "LUX","LVA","MDA","MKD","MLT","MNE","NLD","NOR","POL","PRT","ROU","SMR",
  "SRB","SVK","SVN","SWE","UKR","VAT"
].filter((c) => c in neighbours) as ISO3[];

export function poolForMode(mode: GameMode): readonly ISO3[] {
  if (mode === "Europe") return EUROPE;
  return Object.keys(neighbours) as ISO3[];
}

export function isOutlineMode(mode: GameMode) {
  return mode === "World" || mode === "Europe";
}

export function allowedIso3ForMode(mode: GameMode): readonly ISO3[] {
  return mode === "Europe"
    ? EUROPE
    : (Object.keys(neighbours) as ISO3[]);
}
