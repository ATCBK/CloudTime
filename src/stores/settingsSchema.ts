import { AppSettings } from "../types";

export const DEFAULT_SETTINGS: AppSettings = {
  opacity: 1,
  quickPanelOpacity: 0.88,
  quickPanelHotkey: "Alt+Q",
  quickCreateTodoHotkey: "Alt+N",
  defaultTaskDuration: 60,
  defaultProject: "Cloudo",
  themeMode: "system"
};

export function normalizeSettings(input: Partial<AppSettings> | null | undefined): AppSettings {
  const candidate = input ?? {};
  const themeMode = candidate.themeMode === "light" || candidate.themeMode === "dark" || candidate.themeMode === "system"
    ? candidate.themeMode
    : DEFAULT_SETTINGS.themeMode;
  return {
    opacity: typeof candidate.opacity === "number" ? candidate.opacity : DEFAULT_SETTINGS.opacity,
    quickPanelOpacity: typeof candidate.quickPanelOpacity === "number" ? candidate.quickPanelOpacity : DEFAULT_SETTINGS.quickPanelOpacity,
    quickPanelHotkey: typeof candidate.quickPanelHotkey === "string" ? candidate.quickPanelHotkey : DEFAULT_SETTINGS.quickPanelHotkey,
    quickCreateTodoHotkey:
      typeof candidate.quickCreateTodoHotkey === "string"
        ? candidate.quickCreateTodoHotkey
        : DEFAULT_SETTINGS.quickCreateTodoHotkey,
    defaultTaskDuration:
      typeof candidate.defaultTaskDuration === "number" ? candidate.defaultTaskDuration : DEFAULT_SETTINGS.defaultTaskDuration,
    defaultProject: typeof candidate.defaultProject === "string" ? candidate.defaultProject : DEFAULT_SETTINGS.defaultProject,
    themeMode
  };
}
