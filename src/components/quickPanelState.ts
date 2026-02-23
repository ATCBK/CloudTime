import { TimelineItem, TodoItem } from "../types";

export interface ScheduledTimelineItem extends TimelineItem {
  date: string;
  details?: string;
  completed?: boolean;
}

export interface QuickPanelItem {
  scheduleId: string;
  todoId: string;
  title: string;
  project: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  completed: boolean;
  details: string;
}

function toMinuteOfDay(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function buildQuickPanelItems(
  scheduledItems: ScheduledTimelineItem[],
  todos: TodoItem[],
  dateKey: string
): QuickPanelItem[] {
  const todoMap = new Map(todos.map((todo) => [todo.id, todo]));

  return scheduledItems
    .filter((item) => item.date === dateKey)
    .sort(
      (a, b) =>
        toMinuteOfDay(a.startHour, a.startMinute) - toMinuteOfDay(b.startHour, b.startMinute)
    )
    .map((item) => {
      const linked = todoMap.get(item.todoId);
      return {
        scheduleId: item.id,
        todoId: item.todoId,
        title: item.title,
        project: item.project,
        startHour: item.startHour,
        startMinute: item.startMinute,
        endHour: item.endHour,
        endMinute: item.endMinute,
        completed: linked?.completed ?? item.completed ?? false,
        details: linked?.details ?? item.details ?? ""
      };
    });
}

export function removeTodoAfterSchedule(todos: TodoItem[], todoId: string): TodoItem[] {
  return todos.filter((todo) => todo.id !== todoId);
}
