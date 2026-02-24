import { describe, expect, test } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settingsSchema";

describe("settings normalization", () => {
  test("fills missing fields for legacy settings", () => {
    const normalized = normalizeSettings({ opacity: 0.72 });
    expect(normalized.opacity).toBe(0.72);
    expect(normalized.quickPanelOpacity).toBe(DEFAULT_SETTINGS.quickPanelOpacity);
    expect(normalized.quickPanelHotkey).toBe(DEFAULT_SETTINGS.quickPanelHotkey);
    expect(normalized.quickCreateTodoHotkey).toBe(DEFAULT_SETTINGS.quickCreateTodoHotkey);
    expect(normalized.defaultProject).toBe(DEFAULT_SETTINGS.defaultProject);
    expect(normalized.themeMode).toBe(DEFAULT_SETTINGS.themeMode);
  });

  test("keeps provided valid fields", () => {
    const normalized = normalizeSettings({
      opacity: 0.8,
      quickPanelOpacity: 0.9,
      quickPanelHotkey: "Ctrl+Q",
      quickCreateTodoHotkey: "Ctrl+N",
      defaultTaskDuration: 45,
      defaultProject: "MyProject",
      themeMode: "dark"
    });

    expect(normalized).toEqual({
      opacity: 0.8,
      quickPanelOpacity: 0.9,
      quickPanelHotkey: "Ctrl+Q",
      quickCreateTodoHotkey: "Ctrl+N",
      defaultTaskDuration: 45,
      defaultProject: "MyProject",
      themeMode: "dark"
    });
  });
});
