// Returns a green/orange/red color for a metric value, tuned per metric type.
// Thresholds are reasonable defaults, not clinical guidance.
export function metricColor(
  type: "percent" | "energy" | "sleep",
  value: number | null
): { text: string; bg: string } {
  if (value == null) return { text: "#a3a3a3", bg: "rgba(255,255,255,0.05)" };

  const GREEN = { text: "#4ade80", bg: "rgba(74,222,128,0.12)" };
  const ORANGE = { text: "#fb923c", bg: "rgba(251,146,60,0.12)" };
  const RED = { text: "#f87171", bg: "rgba(248,113,113,0.12)" };

  if (type === "percent") {
    if (value >= 70) return GREEN;
    if (value >= 40) return ORANGE;
    return RED;
  }
  if (type === "energy") {
    // 1-5 scale
    if (value >= 4) return GREEN;
    if (value >= 2.5) return ORANGE;
    return RED;
  }
  if (type === "sleep") {
    // hours
    if (value >= 7) return GREEN;
    if (value >= 5) return ORANGE;
    return RED;
  }
  return { text: "#a3a3a3", bg: "rgba(255,255,255,0.05)" };
}
