import { TodoItem } from "../types";

interface ScheduleDraft {
  title: string;
  project: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  details?: string;
}

interface TaskReferenceCardPayload {
  taskId: string;
  title: string;
  project: string;
  timeLabel: string;
}

function formatClock(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function scheduleToTodoCandidate(schedule: ScheduleDraft): Omit<TodoItem, "id"> {
  const start = schedule.startHour * 60 + schedule.startMinute;
  const end = schedule.endHour * 60 + schedule.endMinute;
  const duration = Math.max(15, end - start);
  const timeLabel = `${formatClock(schedule.startHour, schedule.startMinute)}-${formatClock(schedule.endHour, schedule.endMinute)}`;

  return {
    title: schedule.title,
    project: schedule.project,
    durationMinutes: duration,
    details: schedule.details?.trim() ? schedule.details : `由时间轴回拖生成，原时段 ${timeLabel}`,
    completed: false
  };
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildTaskReferenceCardHtml(payload: TaskReferenceCardPayload): string {
  const title = escapeHtml(payload.title);
  const project = escapeHtml(payload.project);
  const time = escapeHtml(payload.timeLabel);
  const taskId = escapeHtml(payload.taskId);

  return `<div class="ln-task-card" data-task-id="${taskId}"><div class="ln-task-title">${title}</div><div class="ln-task-meta">${project}</div><div class="ln-task-time">${time}</div></div>`;
}

export function toggleTodoCompleted(completed: boolean): boolean {
  return !completed;
}
