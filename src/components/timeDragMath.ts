export function snapToStep(value: number, step: number): number {
  if (step <= 1) return Math.round(value);
  return Math.round(value / step) * step;
}

export function boundRange(start: number, duration: number, total: number): { start: number; end: number } {
  const boundedDuration = Math.max(1, Math.min(duration, total));
  const maxStart = Math.max(0, total - boundedDuration);
  const boundedStart = Math.max(0, Math.min(maxStart, start));
  return { start: boundedStart, end: boundedStart + boundedDuration };
}

export function computeAutoScrollDelta(pointerY: number, containerHeight: number, edge: number, speed: number): number {
  const safeEdge = Math.max(1, edge);
  if (pointerY < safeEdge) {
    const ratio = (safeEdge - pointerY) / safeEdge;
    return -Math.max(1, Math.round(ratio * speed));
  }
  if (pointerY > containerHeight - safeEdge) {
    const ratio = (pointerY - (containerHeight - safeEdge)) / safeEdge;
    return Math.max(1, Math.round(ratio * speed));
  }
  return 0;
}

export function pointerToSnappedRange(
  relativeY: number,
  durationMinutes: number,
  totalMinutes: number,
  pixelsPerHour: number,
  stepMinutes: number
): { start: number; end: number } {
  const clampedY = Math.max(0, relativeY);
  const rawMinute = (clampedY / pixelsPerHour) * 60;
  const snappedStart = snapToStep(rawMinute, stepMinutes);
  return boundRange(snappedStart, durationMinutes, totalMinutes);
}

export function resizeTopEdge(snappedPointer: number, fixedEnd: number, minDuration: number): number {
  return Math.max(0, Math.min(fixedEnd - minDuration, snappedPointer));
}

export function resizeBottomEdge(snappedPointer: number, fixedStart: number, minDuration: number, totalMinutes: number): number {
  return Math.min(totalMinutes, Math.max(fixedStart + minDuration, snappedPointer));
}
