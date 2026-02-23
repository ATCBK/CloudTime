export function computeTimelineUsableWidth(
  timelineWidth: number,
  timelinePadding: number,
  labelWidth: number,
  minCardWidth: number
): number {
  return Math.max(minCardWidth, timelineWidth - timelinePadding * 2 - labelWidth);
}

export function computeLaneWidth(
  timelineUsableWidth: number,
  laneCount: number,
  laneGap: number,
  minCardWidth: number
): number {
  const safeLaneCount = Math.max(1, laneCount);
  return Math.max(minCardWidth, (timelineUsableWidth - (safeLaneCount - 1) * laneGap) / safeLaneCount);
}
