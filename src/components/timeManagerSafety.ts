export interface SafeScheduleLike {
  id: string;
}

export function canCreateTodo(title: string): boolean {
  return title.trim().length > 0;
}

export function removeScheduleWithSnapshot<T extends SafeScheduleLike>(
  items: T[],
  scheduleId: string
): { next: T[]; removed: T | null } {
  const removed = items.find((item) => item.id === scheduleId) ?? null;
  return {
    next: items.filter((item) => item.id !== scheduleId),
    removed
  };
}

export function undoRemovedSchedule<T extends SafeScheduleLike>(items: T[], removed: T | null): T[] {
  if (!removed) return items;
  if (items.some((item) => item.id === removed.id)) return items;
  return [removed, ...items];
}

