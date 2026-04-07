export type AppPage = "time_manager" | "notes" | "settings";

export interface TodoItem {
  id: string;
  title: string;
  project: string;
  durationMinutes: number;
  details?: string;
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
  updatedAt?: number;
}

export interface AppSettings {
  opacity: number;
  quickPanelOpacity: number;
  quickPanelHotkey: string;
  quickCreateTodoHotkey: string;
  defaultTaskDuration: number;
  defaultProject: string;
  themeMode: "system" | "light" | "dark";
}
