export const BENCHMARK_WODS = new Set([
  // The Girls
  "Angie",
  "Barbara",
  "Chelsea",
  "Cindy",
  "Diane",
  "Elizabeth",
  "Fran",
  "Grace",
  "Helen",
  "Isabel",
  "Jackie",
  "Karen",
  "Linda",
  "Mary",
  "Nancy",
  // The Heroes (partial — expandable)
  "Murph",
  "DT",
  "Nate",
  "Randy",
  "Ryan",
  "JT",
  "Danny",
  "Lumberjack 20",
  "Nutts",
]);

export function isBenchmark(title: string | null | undefined): boolean {
  if (!title) return false;
  const normalized = title.trim();
  for (const name of BENCHMARK_WODS) {
    if (normalized.toLowerCase() === name.toLowerCase()) return true;
  }
  // Word-boundary match: "Fran + Back Squat" → true
  for (const name of BENCHMARK_WODS) {
    const re = new RegExp(`\\b${name}\\b`, "i");
    if (re.test(normalized)) return true;
  }
  return false;
}
