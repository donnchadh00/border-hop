import neighbours from "../data/neighbours.json";
export type ISO3 = keyof typeof neighbours;

export type GameMode =
  | "Practice"
  | "Europe"
  | "Asia"
  | "Africa"
  | "Americas"
  | "Time Trial"
  | "World";

export const EUROPE: readonly ISO3[] = [
  "ALB","AND","AUT","BEL","BIH","BGR","BLR","CHE","CZE","DEU","DNK","ESP",
  "EST","FIN","FRA","GBR","GRC","HRV","HUN","IRL","ISL","ITA","LIE","LTU",
  "LUX","LVA","MDA","MKD","MLT","MNE","NLD","NOR","POL","PRT","ROU","SMR",
  "SRB","SVK","SVN","SWE","UKR","VAT"
].filter((c) => c in neighbours) as ISO3[];

export const ASIA: readonly ISO3[] = [
  "AFG","ARE","ARM","AZE","BGD","BHR","BRN","BTN","CHN","CYP","GEO","IDN",
  "IND","IRN","IRQ","ISR","JOR","JPN","KAZ","KGZ","KHM","KOR","KWT","LAO",
  "LBN","LKA","MMR","MNG","MYS","NPL","OMN","PAK","PHL","PRK","QAT","RUS",
  "SAU","SGP","SYR","THA","TJK","TKM","TLS","TUR","UZB","VNM","YEM"
].filter((c) => c in neighbours) as ISO3[];

export const AFRICA: readonly ISO3[] = [
  "AGO","BDI","BEN","BFA","BWA","CAF","CIV","CMR","COD","COG","COM","CPV",
  "DJI","DZA","EGY","ERI","ETH","GAB","GHA","GIN","GMB","GNB","GNQ","KEN",
  "LBR","LBY","LSO","MAR","MDG","MLI","MOZ","MRT","MUS","MWI","NAM","NER",
  "NGA","RWA","SDN","SEN","SLE","SOM","SSD","STP","SWZ","SYC","TCD","TGO",
  "TUN","TZA","UGA","ZAF","ZMB","ZWE"
].filter((c) => c in neighbours) as ISO3[];

export const AMERICAS: readonly ISO3[] = [
  "ARG","ATG","BHS","BLZ","BOL","BRA","BRB","CAN","CHL","COL","CRI","CUB",
  "DMA","DOM","ECU","GRD","GTM","GUY","HND","HTI","JAM","KNA","LCA","MEX",
  "NIC","PAN","PER","PRY","SLV","SUR","TTO","URY","USA","VCT","VEN"
].filter((c) => c in neighbours) as ISO3[];

export function poolForMode(mode: GameMode): readonly ISO3[] {
  switch (mode) {
    case "Europe":
      return EUROPE;
    case "Asia":
      return ASIA;
    case "Africa":
      return AFRICA;
    case "Americas":
      return AMERICAS;
    default:
      return Object.keys(neighbours) as ISO3[];
  }
}

export function isOutlineMode(mode: GameMode) {
  return (
    mode === "World" ||
    mode === "Europe" ||
    mode === "Asia" ||
    mode === "Africa" ||
    mode === "Americas"
  );
}

export function allowedIso3ForMode(mode: GameMode): readonly ISO3[] {
  switch (mode) {
    case "Europe":
      return EUROPE;
    case "Asia":
      return ASIA;
    case "Africa":
      return AFRICA;
    case "Americas":
      return AMERICAS;
    default:
      return Object.keys(neighbours) as ISO3[];
  }
}
