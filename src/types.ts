export type AppPage = "time_manager" | "notes" | "settings";

export interface TodoItem {
  id: string;
  title: string;
  project: string;
  durationMinutes: number;
  completed: boolean;
}

export interface TimelineItem {
  id: string;
  todoId: string;
  title: string;
  project: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface NoteDocument {
  id: string;
  project: string;
  title: string;
  date: string;
  content: string;
}

export interface AppSettings {
  opacity: number;
  defaultTaskDuration: number;
  defaultProject: string;
}
