import { create } from "zustand";
import { AppPage } from "../types";

const STORAGE_KEY = "cloudo.app.activePage";

function readStoredPage(): AppPage {
  if (typeof window === "undefined") return "time_manager";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return "time_manager";
    const parsed = JSON.parse(raw);
    if (parsed === "notes" || parsed === "settings" || parsed === "time_manager") return parsed;
  } catch {
    // Ignore malformed storage payload.
  }
  return "time_manager";
}

function writeStoredPage(page: AppPage): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(page));
}

interface NavigationState {
  activePage: AppPage;
  setActivePage: (page: AppPage) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activePage: readStoredPage(),
  setActivePage: (page) => {
    writeStoredPage(page);
    set({ activePage: page });
  }
}));
