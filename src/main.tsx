import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { QuickPanelWindow } from "./components/QuickPanelWindow";
import "./styles.css";
import "./scrollbar.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found.");

const params = new URLSearchParams(window.location.search);
const isQuickPanelView = params.get("view") === "quick-panel";

createRoot(root).render(
  <React.StrictMode>
    {isQuickPanelView ? <QuickPanelWindow /> : <App />}
  </React.StrictMode>
);
