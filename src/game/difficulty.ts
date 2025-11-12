export type Difficulty = "Easy" | "Normal" | "Hard" | "Extreme";

export const DIFFICULTY_PRESETS: Record<Difficulty, { minHops: number; maxHops: number }> = {
  Easy: { minHops: 1, min: 1, maxHops: 4 } as any,
  Normal: { minHops: 2, maxHops: 7 },
  Hard: { minHops: 3, maxHops: 12 },
  Extreme: { minHops: 5, maxHops: 24 },
};

export function paramsForDifficulty(d: Difficulty) {
  return DIFFICULTY_PRESETS[d] ?? DIFFICULTY_PRESETS.Normal;
}
