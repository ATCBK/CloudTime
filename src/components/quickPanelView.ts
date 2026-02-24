export function isQuickPanelViewSearch(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get("view") === "quick-panel";
}

