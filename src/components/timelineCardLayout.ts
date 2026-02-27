export type TimelineCardDensity = "compact" | "regular";

export function getTimelineCardDensity(durationMinutes: number): TimelineCardDensity {
  return durationMinutes <= 60 ? "compact" : "regular";
}
