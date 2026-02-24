import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { QuickPanelWindow } from "./components/QuickPanelWindow";
import { isQuickPanelViewSearch } from "./components/quickPanelView";
import "./styles.css";
import "./scrollbar.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found.");

const isQuickPanelView = isQuickPanelViewSearch(window.location.search);
if (isQuickPanelView) {
  document.documentElement.classList.add("quick-panel-window-view");
  document.body.classList.add("quick-panel-window-view");
}

createRoot(root).render(
  <React.StrictMode>
    {isQuickPanelView ? <QuickPanelWindow /> : <App />}
  </React.StrictMode>
);
