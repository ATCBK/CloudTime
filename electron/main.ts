import path from "node:path";
import fs from "node:fs/promises";
import { app, BrowserWindow, globalShortcut, ipcMain, nativeImage } from "electron";

const MAIN_TOGGLE_HOTKEY = "Alt+Space";
const DEFAULT_DYNAMIC_HOTKEYS = {
  toggleQuickPanel: "Alt+Q",
  quickCreateTodo: "Alt+N"
} as const;
const APP_ICON_PATH = path.join(__dirname, "../etc", "云朵待办.png");

type DynamicHotkeys = {
  toggleQuickPanel: string;
  quickCreateTodo: string;
};

type DiskMarkdownNote = {
  relativeDir: string;
  fileName: string;
  content: string;
  updatedAt: number;
};

let mainWindow: BrowserWindow | null = null;
let quickPanelWindow: BrowserWindow | null = null;
let quickPanelOpacity = 0.88;
let quickPanelState: unknown[] = [];
let dynamicHotkeys: DynamicHotkeys = { ...DEFAULT_DYNAMIC_HOTKEYS };

app.commandLine.appendSwitch("disable-features", "OverlayScrollbar,OverlayScrollbars,OverlayScrollbarFlashAfterAnyScrollUpdate");

function resolveAppIcon(): Electron.NativeImage | undefined {
  const icon = nativeImage.createFromPath(APP_ICON_PATH);
  if (icon.isEmpty()) return undefined;
  return icon;
}

async function loadRenderer(win: BrowserWindow, view?: "quick-panel"): Promise<void> {
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    const url = view ? `${devUrl}?view=${view}` : devUrl;
    await win.loadURL(url);
    return;
  }

  await win.loadFile(path.join(__dirname, "../dist/index.html"), view ? { query: { view } } : undefined);
}

function createMainWindow(): BrowserWindow {
  const icon = resolveAppIcon();
  const win = new BrowserWindow({
    width: 1200,
    height: 760,
    show: false,
    frame: true,
    backgroundColor: "#fbfafa",
    icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  void loadRenderer(win);

  win.once("ready-to-show", () => {
    win.show();
  });

  return win;
}

function createQuickPanelWindow(): BrowserWindow {
  const icon = resolveAppIcon();
  const win = new BrowserWindow({
    width: 460,
    height: 620,
    show: false,
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: "#00000000",
    icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setOpacity(quickPanelOpacity);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  void loadRenderer(win, "quick-panel");

  win.webContents.on("did-finish-load", () => {
    win.webContents.send("quick-panel:state", quickPanelState);
  });

  win.on("closed", () => {
    if (quickPanelWindow === win) quickPanelWindow = null;
  });

  return win;
}

function getQuickPanelWindow(): BrowserWindow {
  if (quickPanelWindow && !quickPanelWindow.isDestroyed()) return quickPanelWindow;
  quickPanelWindow = createQuickPanelWindow();
  return quickPanelWindow;
}

function toggleWindowVisibility(): void {
  if (!mainWindow) return;
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
    return;
  }
  mainWindow.show();
  mainWindow.focus();
}

function toggleQuickPanelVisibility(): void {
  const win = getQuickPanelWindow();
  if (win.isVisible()) {
    win.hide();
    return;
  }
  win.show();
  win.focus();
}

function focusQuickCreateOnMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow();
  }
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("quick-create:focus");
}

function sanitizeAccelerator(input: string): string {
  return input.trim();
}

function tryRegisterAccelerator(accelerator: string, action: () => void): boolean {
  return globalShortcut.register(accelerator, action);
}

function registerDynamicHotkeys(next: DynamicHotkeys): { ok: boolean; message?: string } {
  const toggleQuickPanel = sanitizeAccelerator(next.toggleQuickPanel);
  const quickCreateTodo = sanitizeAccelerator(next.quickCreateTodo);

  if (!toggleQuickPanel || !quickCreateTodo) {
    return { ok: false, message: "快捷键不能为空" };
  }

  if (toggleQuickPanel.toLowerCase() === quickCreateTodo.toLowerCase()) {
    return { ok: false, message: "两个快捷键不能相同" };
  }

  const prev = { ...dynamicHotkeys };
  globalShortcut.unregister(prev.toggleQuickPanel);
  globalShortcut.unregister(prev.quickCreateTodo);

  const regToggle = tryRegisterAccelerator(toggleQuickPanel, () => {
    toggleQuickPanelVisibility();
  });
  if (!regToggle) {
    void tryRegisterAccelerator(prev.toggleQuickPanel, () => toggleQuickPanelVisibility());
    void tryRegisterAccelerator(prev.quickCreateTodo, () => focusQuickCreateOnMainWindow());
    return { ok: false, message: `快捷键冲突或无效: ${toggleQuickPanel}` };
  }

  const regCreate = tryRegisterAccelerator(quickCreateTodo, () => {
    focusQuickCreateOnMainWindow();
  });
  if (!regCreate) {
    globalShortcut.unregister(toggleQuickPanel);
    void tryRegisterAccelerator(prev.toggleQuickPanel, () => toggleQuickPanelVisibility());
    void tryRegisterAccelerator(prev.quickCreateTodo, () => focusQuickCreateOnMainWindow());
    return { ok: false, message: `快捷键冲突或无效: ${quickCreateTodo}` };
  }

  dynamicHotkeys = { toggleQuickPanel, quickCreateTodo };
  return { ok: true };
}

async function ensureDataDirs(): Promise<string> {
  const baseDir = path.join(app.getPath("documents"), "Cloudo");
  await fs.mkdir(path.join(baseDir, "Notes"), { recursive: true });
  await fs.mkdir(path.join(baseDir, "data"), { recursive: true });
  await fs.mkdir(path.join(baseDir, "config"), { recursive: true });
  return baseDir;
}

async function readMarkdownFiles(dir: string, relativeDir: string = ""): Promise<DiskMarkdownNote[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: DiskMarkdownNote[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nestedRelative = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      files.push(...(await readMarkdownFiles(fullPath, nestedRelative)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith(".md")) continue;

    const [content, stat] = await Promise.all([fs.readFile(fullPath, "utf8"), fs.stat(fullPath)]);
    files.push({
      relativeDir,
      fileName: entry.name,
      content,
      updatedAt: stat.mtimeMs
    });
  }

  return files;
}

app.whenReady().then(async () => {
  app.setAppUserModelId("com.cloudo.app");
  await ensureDataDirs();
  mainWindow = createMainWindow();

  globalShortcut.register(MAIN_TOGGLE_HOTKEY, () => {
    toggleWindowVisibility();
  });

  void registerDynamicHotkeys(dynamicHotkeys);

  app.on("activate", () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("window:setOpacity", (_event, value: number) => {
  if (!mainWindow) return;
  const normalized = Math.max(0.2, Math.min(1, value));
  mainWindow.setOpacity(normalized);
});

ipcMain.handle("window:toggle", () => {
  toggleWindowVisibility();
});

ipcMain.handle("window:toggleQuickPanel", () => {
  toggleQuickPanelVisibility();
});

ipcMain.handle("quickPanel:setOpacity", (_event, value: number) => {
  quickPanelOpacity = Math.max(0.2, Math.min(1, value));
  if (quickPanelWindow && !quickPanelWindow.isDestroyed()) {
    quickPanelWindow.setOpacity(quickPanelOpacity);
  }
});

ipcMain.handle("quickPanel:updateState", (_event, payload: unknown[]) => {
  quickPanelState = Array.isArray(payload) ? payload : [];
  if (quickPanelWindow && !quickPanelWindow.isDestroyed()) {
    quickPanelWindow.webContents.send("quick-panel:state", quickPanelState);
  }
});

ipcMain.handle("quickPanel:toggleTask", (_event, todoId: unknown) => {
  if (!mainWindow || typeof todoId !== "string" || !todoId.trim()) return;
  mainWindow.webContents.send("quick-panel:toggle-task", todoId);
});

ipcMain.handle("hotkeys:getDynamic", () => dynamicHotkeys);

ipcMain.handle("hotkeys:setDynamic", (_event, next: DynamicHotkeys) => {
  return registerDynamicHotkeys(next);
});

ipcMain.handle("storage:getBaseDir", async () => ensureDataDirs());

ipcMain.handle("notes:listDiskMarkdown", async () => {
  const baseDir = await ensureDataDirs();
  const notesDir = path.join(baseDir, "Notes");
  return readMarkdownFiles(notesDir);
});
