import { useEffect, useMemo, useState } from "react";
import { NotesPage } from "./components/NotesPage";
import { SettingsPage } from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { TimeManagerPage } from "./components/TimeManagerPage";
import { useLocalStorageState } from "./hooks/useLocalStorageState";
import { mockNotes, mockTimeline, mockTodos } from "./mockData";
import { AppPage, AppSettings } from "./types";

const DEFAULT_SETTINGS: AppSettings = {
  opacity: 1,
  quickPanelOpacity: 0.88,
  quickPanelHotkey: "Alt+Q",
  quickCreateTodoHotkey: "Alt+N",
  defaultTaskDuration: 60,
  defaultProject: "Cloudo"
};

export function App(): JSX.Element {
  const [activePage, setActivePage] = useLocalStorageState<AppPage>("cloudo.app.activePage", "time_manager");
  const [settings, setSettings] = useLocalStorageState<AppSettings>("cloudo.app.settings", DEFAULT_SETTINGS);
  const [baseDir, setBaseDir] = useState<string>("");

  useEffect(() => {
    window.cloudo
      .getStorageBaseDir()
      .then(setBaseDir)
      .catch(() => setBaseDir("不可用"));
  }, []);

  useEffect(() => {
    if (typeof settings.quickPanelOpacity === "number" && typeof settings.quickPanelHotkey === "string") return;
    setSettings((prev) => ({ ...DEFAULT_SETTINGS, ...prev, quickPanelOpacity: 0.88, quickPanelHotkey: "Alt+Q", quickCreateTodoHotkey: "Alt+N" }));
  }, [settings, setSettings]);

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
        setSettings((prev) => ({
          ...prev,
          quickPanelHotkey: hotkeys.toggleQuickPanel,
          quickCreateTodoHotkey: hotkeys.quickCreateTodo
        }));
      })
      .catch(() => {
        // Keep local defaults when electron hotkey sync fails.
      });
  }, [setSettings]);

  useEffect(() => {
    const unsubscribe = window.cloudo.onQuickCreateFocus(() => {
      setActivePage("time_manager");
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent("cloudo:focusQuickCreate"));
      }, 30);
    });
    return unsubscribe;
  }, [setActivePage]);

  const content = useMemo(() => {
    if (activePage === "time_manager") return <TimeManagerPage todos={mockTodos} timelineItems={mockTimeline} />;
    if (activePage === "notes") return <NotesPage notes={mockNotes} baseDir={baseDir} />;

    return (
      <SettingsPage
        settings={settings}
        onOpacityChange={(value) => setSettings((prev) => ({ ...prev, opacity: value }))}
        onQuickPanelOpacityChange={(value) => setSettings((prev) => ({ ...prev, quickPanelOpacity: value }))}
        onHotkeysChange={async (quickPanelHotkey, quickCreateTodoHotkey) => {
          const result = await window.cloudo.setDynamicHotkeys({
            toggleQuickPanel: quickPanelHotkey,
            quickCreateTodo: quickCreateTodoHotkey
          });

          if (result.ok) {
            setSettings((prev) => ({
              ...prev,
              quickPanelHotkey,
              quickCreateTodoHotkey
            }));
          }

          return result;
        }}
      />
    );
  }, [activePage, settings, baseDir, setSettings]);

  const shellClassName = ["app-shell", activePage === "time_manager" ? "time-manager-shell" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <main className="content">{content}</main>
    </div>
  );
}
