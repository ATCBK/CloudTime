import path from "node:path";
import { app, BrowserWindow, globalShortcut, ipcMain, nativeImage } from "electron";
import fs from "node:fs/promises";

const HOTKEY = "Alt+Space";
let mainWindow: BrowserWindow | null = null;
const APP_ICON_PATH = path.join(__dirname, "../etc", "\u4e91\u6735\u5f85\u529e.png");

// Ensure CSS native scrollbar styling applies consistently on Windows/Electron.
app.commandLine.appendSwitch("disable-features", "OverlayScrollbar,OverlayScrollbars,OverlayScrollbarFlashAfterAnyScrollUpdate");

function resolveAppIcon(): Electron.NativeImage | undefined {
  const icon = nativeImage.createFromPath(APP_ICON_PATH);
  if (icon.isEmpty()) return undefined;
  return icon;
}

function createWindow(): BrowserWindow {
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

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    void win.loadURL(devUrl);
  } else {
    void win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  win.once("ready-to-show", () => {
    win.show();
  });

  return win;
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

async function ensureDataDirs(): Promise<string> {
  const baseDir = path.join(app.getPath("documents"), "Cloudo");
  await fs.mkdir(path.join(baseDir, "Notes"), { recursive: true });
  await fs.mkdir(path.join(baseDir, "data"), { recursive: true });
  await fs.mkdir(path.join(baseDir, "config"), { recursive: true });
  return baseDir;
}

app.whenReady().then(async () => {
  app.setAppUserModelId("com.cloudo.app");
  await ensureDataDirs();
  mainWindow = createWindow();

  globalShortcut.register(HOTKEY, () => {
    toggleWindowVisibility();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
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

ipcMain.handle("storage:getBaseDir", async () => ensureDataDirs());

ipcMain.handle("window:toggle", () => {
  toggleWindowVisibility();
});

