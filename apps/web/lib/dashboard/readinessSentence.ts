import type { ReadinessResponse } from "@/lib/api";

export function readinessSentence(
  data: ReadinessResponse | null,
  isComeback = false,
): string {
  if (isComeback) {
    return "Welcome back — start steady and rebuild momentum.";
  }
  if (!data) {
    return "Ready to train? Log a session and your readiness will appear here.";
  }

  if (data.label === "insufficient_data") {
    return "You're just getting started. Log a few more sessions and your readiness trend will appear here.";
  }

  const { score } = data;

  if (data.recovery_score != null) {
    const recoveryPct = Math.round(data.recovery_score * 100);
    if (score > 0.7 && recoveryPct >= 70) {
      return "Your HRV looks strong and training load is balanced — a great day to push hard.";
    }
    if (score > 0.7 && recoveryPct < 70) {
      return "Training load is well-managed, though your HRV is a little low. A steady session will serve you well.";
    }
    if (score >= 0.5) {
      return "Your body is adapting. Moderate effort today will keep the momentum going.";
    }
    if (score >= 0.3) {
      return "Fatigue is building. Consider a lighter session or technique work today.";
    }
    return "Your body is signalling it needs recovery. A rest day or easy movement is recommended.";
  }

  if (score > 0.7) {
    return "Your body is fresh and fitness is trending up — a great day to push hard.";
  }
  if (score >= 0.5) {
    return "You're in good shape. A steady session will serve you well today.";
  }
  if (score >= 0.3) {
    return "Moderate fatigue detected. Consider a lighter session today.";
  }
  return "Your body needs recovery. A rest day or easy movement is recommended.";
}
