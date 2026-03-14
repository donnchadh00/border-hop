export type Difficulty = "Easy" | "Normal" | "Hard" | "Extreme";

export const DIFFICULTY_PRESETS: Record<
  Difficulty,
  { minHops: number; maxHops: number }
> = {
  Easy:    { minHops: 2, maxHops: 4 },
  Normal:  { minHops: 2, maxHops: 7 },
  Hard:    { minHops: 3, maxHops: 12 },
  Extreme: { minHops: 5, maxHops: 24 },
};

export function paramsForDifficulty(d: Difficulty) {
  return DIFFICULTY_PRESETS[d] ?? DIFFICULTY_PRESETS.Normal;
}

export function attemptBudgetFor(
  d: Difficulty,
  minHops: number,
  poolSize: number
) {
  void minHops;
  void poolSize;

  switch (d) {
    case "Easy": return 200;
    case "Normal": return 400;
    case "Hard": return 800;
    case "Extreme": return 1500;
  }
}
