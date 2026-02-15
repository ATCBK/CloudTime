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
  defaultTaskDuration: 60,
  defaultProject: "Cloudo"
};

export function App(): JSX.Element {
  const [activePage, setActivePage] = useLocalStorageState<AppPage>("cloudo.app.activePage", "time_manager");
  const [settings, setSettings] = useLocalStorageState<AppSettings>("cloudo.app.settings", DEFAULT_SETTINGS);
  const [baseDir, setBaseDir] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState<boolean>("cloudo.app.sidebarCollapsed", false);

  useEffect(() => {
    window.cloudo
      .getStorageBaseDir()
      .then(setBaseDir)
      .catch(() => setBaseDir("不可用"));
  }, []);

  useEffect(() => {
    void window.cloudo.setWindowOpacity(settings.opacity);
  }, [settings.opacity]);

  const content = useMemo(() => {
    if (activePage === "time_manager") return <TimeManagerPage todos={mockTodos} timelineItems={mockTimeline} />;
    if (activePage === "notes") return <NotesPage notes={mockNotes} baseDir={baseDir} />;

    return (
      <SettingsPage
        settings={settings}
        onOpacityChange={(value) => setSettings((prev) => ({ ...prev, opacity: value }))}
      />
    );
  }, [activePage, settings]);

  return (
    <div className={sidebarCollapsed ? "app-shell sidebar-collapsed" : "app-shell"}>
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
      <main className="content">{content}</main>
    </div>
  );
}
