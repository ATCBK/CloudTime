import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { pathToPage, pageToPath } from "./navigation";
import { useNavigationStore } from "../stores/useNavigationStore";
import { AppEffects } from "./AppEffects";

export function AppShellLayout(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const setActivePage = useNavigationStore((state) => state.setActivePage);

  const activePage = pathToPage(location.pathname);

  useEffect(() => {
    setActivePage(activePage);
  }, [activePage, setActivePage]);

  const shellClassName = ["app-shell", activePage === "time_manager" ? "time-manager-shell" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName} data-page={activePage}>
      <AppEffects />
      <Sidebar
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page);
          navigate(pageToPath(page));
        }}
      />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
