import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { pageToPath } from "./navigation";
import { resolveEffectiveTheme } from "./themeMode";
import { useNavigationStore } from "../stores/useNavigationStore";
import { useRuntimeStore } from "../stores/useRuntimeStore";
import { useSettingsStore } from "../stores/useSettingsStore";

export function AppEffects(): null {
  const navigate = useNavigate();
  const patchSettings = useSettingsStore((state) => state.patchSettings);
  const settings = useSettingsStore((state) => state.settings);
  const setBaseDir = useRuntimeStore((state) => state.setBaseDir);
  const setActivePage = useNavigationStore((state) => state.setActivePage);

  useEffect(() => {
    window.cloudo
      .getStorageBaseDir()
      .then(setBaseDir)
      .catch(() => setBaseDir("不可用"));
  }, [setBaseDir]);

  useEffect(() => {
    void window.cloudo.setWindowOpacity(settings.opacity);
  }, [settings.opacity]);

  useEffect(() => {
    void window.cloudo.setQuickPanelOpacity(settings.quickPanelOpacity);
  }, [settings.quickPanelOpacity]);

  useEffect(() => {
    window.cloudo
      .getDynamicHotkeys()
      .then((hotkeys) => {
        patchSettings({
          quickPanelHotkey: hotkeys.toggleQuickPanel,
          quickCreateTodoHotkey: hotkeys.quickCreateTodo
        });
      })
      .catch(() => {
        // Keep local defaults when electron hotkey sync fails.
      });
  }, [patchSettings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = (): void => {
      const effective = resolveEffectiveTheme(settings.themeMode, media.matches);
      document.documentElement.setAttribute("data-theme", effective);
    };
    applyTheme();
    const onChange = (): void => applyTheme();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [settings.themeMode]);

  useEffect(() => {
    const unsubscribe = window.cloudo.onQuickCreateFocus(() => {
      setActivePage("time_manager");
      navigate(pageToPath("time_manager"));
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("cloudo:focusQuickCreate"));
      }, 30);
    });
    return unsubscribe;
  }, [navigate, setActivePage]);

  return null;
}
