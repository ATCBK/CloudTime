export function formatExplosiveCardTitle(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日任务`;
}

export function getIncompleteTodoIds(items: Array<{ todoId: string; completed: boolean }>): string[] {
  const unique = new Set<string>();
  for (const item of items) {
    if (!item.completed) unique.add(item.todoId);
  }
  return [...unique];
}

