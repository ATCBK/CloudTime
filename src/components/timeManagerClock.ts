export function buildHourSlots24(): number[] {
  return Array.from({ length: 24 }, (_, index) => index);
}

export function computeMinuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function computeMsUntilNextMidnight(date: Date): number {
  const next = new Date(date);
  next.setHours(24, 0, 0, 0);
  return Math.max(1, next.getTime() - date.getTime());
}

export function computeMsUntilTodayRecycle(date: Date): number {
  const recycle = new Date(date);
  recycle.setHours(23, 59, 0, 0);
  if (recycle.getTime() <= date.getTime()) recycle.setDate(recycle.getDate() + 1);
  return Math.max(1, recycle.getTime() - date.getTime());
}

export function computeNowLineTop(minuteOfDay: number, pixelsPerHour: number): number {
  return (minuteOfDay / 60) * pixelsPerHour;
}

export function toggleWeekExpandedDate(current: string | null, target: string): string | null {
  return current === target ? null : target;
}

export function isSameDateKey(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

function parseClockToMinute(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

export function parseQuickTimeInput(input: string): { startMinute: number; endMinute: number } | null {
  const raw = input.trim();
  if (!raw) return null;

  if (!raw.includes("-")) {
    const startMinute = parseClockToMinute(raw);
    if (startMinute === null) return null;
    return { startMinute, endMinute: Math.min(24 * 60, startMinute + 60) };
  }

  const [startRaw, endRaw] = raw.split("-");
  const startMinute = parseClockToMinute(startRaw);
  const endMinute = parseClockToMinute(endRaw);
  if (startMinute === null || endMinute === null || endMinute <= startMinute) return null;
  return { startMinute, endMinute };
}
