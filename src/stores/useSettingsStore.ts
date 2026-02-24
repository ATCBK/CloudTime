import { create } from "zustand";
import { AppSettings } from "../types";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settingsSchema";

const STORAGE_KEY = "cloudo.app.settings";

function readStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeStoredSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface SettingsState {
  settings: AppSettings;
  setSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  patchSettings: (patch: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: readStoredSettings(),
  setSettings: (updater) =>
    set((state) => {
      const next = normalizeSettings(updater(state.settings));
      writeStoredSettings(next);
      return { settings: next };
    }),
  patchSettings: (patch) =>
    set((state) => {
      const next = normalizeSettings({ ...state.settings, ...patch });
      writeStoredSettings(next);
      return { settings: next };
    })
}));
