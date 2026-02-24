import { AppPage } from "../types";

const PAGE_PATH_MAP: Record<AppPage, string> = {
  time_manager: "/time",
  notes: "/notes",
  settings: "/settings"
};

export function pageToPath(page: AppPage): string {
  return PAGE_PATH_MAP[page] ?? "/time";
}

export function pathToPage(pathname: string): AppPage {
  if (pathname === "/notes") return "notes";
  if (pathname === "/settings") return "settings";
  return "time_manager";
}
