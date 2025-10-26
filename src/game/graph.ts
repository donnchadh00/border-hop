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
