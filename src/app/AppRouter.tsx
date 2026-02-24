import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { useNavigationStore } from "../stores/useNavigationStore";
import { pageToPath } from "./navigation";
import { AppShellLayout } from "./AppShellLayout";
import { NotesRoute } from "./routes/NotesRoute";
import { SettingsRoute } from "./routes/SettingsRoute";
import { TimeManagerRoute } from "./routes/TimeManagerRoute";

function RootRedirect(): JSX.Element {
  const activePage = useNavigationStore((state) => state.activePage);
  return <Navigate to={pageToPath(activePage)} replace />;
}

export function AppRouter(): JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShellLayout />}>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/time" element={<TimeManagerRoute />} />
          <Route path="/notes" element={<NotesRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="*" element={<Navigate to="/time" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
