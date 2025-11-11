export type Graph = Record<string, readonly string[]>;

export function bfsShortestPath(
  graph: Graph,
  start: string,
  goal: string
): string[] | null {
  if (start === goal) return [start];
  const q: string[][] = [[start]];
  const seen = new Set([start]);
  while (q.length) {
    const path = q.shift()!;
    const last = path[path.length - 1];
    for (const nb of graph[last] ?? []) {
      if (seen.has(nb)) continue;
      const next = [...path, nb];
      if (nb === goal) return next;
      seen.add(nb);
      q.push(next);
    }
  }
  return null;
}

export function pickReachablePair(
  graph: Graph,
  pool: readonly string[],
  opts?: { minHops?: number; maxHops?: number; maxAttempts?: number }
): { start: string; target: string; path: string[] } | null {
  const minHops = opts?.minHops ?? 2;
  const maxHops = opts?.maxHops ?? Infinity;
  const maxAttempts = opts?.maxAttempts ?? 500;

  const candidates = pool.filter((c) => (graph[c]?.length ?? 0) > 0);
  if (candidates.length < 2) return null;

  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const start = pick(candidates);
    let target = pick(candidates);
    if (target === start) {
      const filtered = candidates.filter((x) => x !== start);
      if (!filtered.length) continue;
      target = pick(filtered);
    }
    const path = bfsShortestPath(graph, start, target);
    if (!path) continue;
    const hops = path.length - 1;
    if (hops < minHops || hops > maxHops) continue;
    return { start, target, path };
  }
  return null;
}
