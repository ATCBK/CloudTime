import { AppSettings } from "../types";

export type EffectiveTheme = "light" | "dark";

export function resolveEffectiveTheme(mode: AppSettings["themeMode"], systemPrefersDark: boolean): EffectiveTheme {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return systemPrefersDark ? "dark" : "light";
}

export function getNextManualThemeMode(
  mode: AppSettings["themeMode"],
  systemPrefersDark: boolean
): Extract<AppSettings["themeMode"], "light" | "dark"> {
  const effective = resolveEffectiveTheme(mode, systemPrefersDark);
  return effective === "dark" ? "light" : "dark";
}
