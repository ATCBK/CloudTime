import { useEffect, useState } from "react";
import { AppSettings } from "../types";

interface SettingsPageProps {
  settings: AppSettings;
  onOpacityChange: (value: number) => void;
  onQuickPanelOpacityChange: (value: number) => void;
  onHotkeysChange: (quickPanelHotkey: string, quickCreateTodoHotkey: string) => Promise<{ ok: boolean; message?: string }>;
}

export function SettingsPage({ settings, onOpacityChange, onQuickPanelOpacityChange, onHotkeysChange }: SettingsPageProps): JSX.Element {
  const [quickPanelHotkeyInput, setQuickPanelHotkeyInput] = useState(settings.quickPanelHotkey);
  const [quickCreateHotkeyInput, setQuickCreateHotkeyInput] = useState(settings.quickCreateTodoHotkey);
  const [hotkeyMessage, setHotkeyMessage] = useState<string>("");

  useEffect(() => {
    setQuickPanelHotkeyInput(settings.quickPanelHotkey);
    setQuickCreateHotkeyInput(settings.quickCreateTodoHotkey);
  }, [settings.quickPanelHotkey, settings.quickCreateTodoHotkey]);

  const applyHotkeys = async (): Promise<void> => {
    const result = await onHotkeysChange(quickPanelHotkeyInput.trim(), quickCreateHotkeyInput.trim());
    setHotkeyMessage(result.ok ? "快捷键已更新" : result.message ?? "快捷键设置失败");
  };

  return (
    <section className="page">
      <header className="topbar">
        <h2>设置</h2>
      </header>

      <div className="settings-grid">
        <section className="panel">
          <h3>外观</h3>
          <label className="settings-row" htmlFor="opacity">
            主窗口透明度（默认 100%）
          </label>
          <input
            id="opacity"
            type="range"
            min={20}
            max={100}
            value={Math.round(settings.opacity * 100)}
            onChange={(event) => onOpacityChange(Number(event.target.value) / 100)}
          />
          <p className="soft-text">{Math.round(settings.opacity * 100)}%</p>

          <label className="settings-row" htmlFor="quick-panel-opacity">
            快捷浮窗透明度（独立）
          </label>
          <input
            id="quick-panel-opacity"
            type="range"
            min={20}
            max={100}
            value={Math.round(settings.quickPanelOpacity * 100)}
            onChange={(event) => onQuickPanelOpacityChange(Number(event.target.value) / 100)}
          />
          <p className="soft-text">{Math.round(settings.quickPanelOpacity * 100)}%</p>
        </section>

        <section className="panel">
          <h3>快捷键</h3>
          <label className="settings-row" htmlFor="quick-panel-hotkey">浮窗显示/隐藏</label>
          <input
            id="quick-panel-hotkey"
            value={quickPanelHotkeyInput}
            onChange={(event) => setQuickPanelHotkeyInput(event.target.value)}
            placeholder="例如 Alt+Q"
          />

          <label className="settings-row" htmlFor="quick-create-hotkey">快捷创建待办</label>
          <input
            id="quick-create-hotkey"
            value={quickCreateHotkeyInput}
            onChange={(event) => setQuickCreateHotkeyInput(event.target.value)}
            placeholder="例如 Alt+N"
          />

          <div className="settings-hotkey-actions">
            <button className="accent-btn" type="button" onClick={() => void applyHotkeys()}>保存快捷键</button>
            <button
              type="button"
              className="tiny-btn"
              onClick={() => {
                setQuickPanelHotkeyInput("Alt+Q");
                setQuickCreateHotkeyInput("Alt+N");
                setHotkeyMessage("已恢复默认，点击保存生效");
              }}
            >
              恢复默认
            </button>
          </div>
          <p className="soft-text">{hotkeyMessage || "冲突时不会保存"}</p>
          <p className="soft-text">主窗口快捷键固定: Alt + Space</p>
        </section>

        <section className="panel">
          <h3>存储</h3>
          <p className="soft-text">Markdown 按项目文件夹管理</p>
        </section>
      </div>
    </section>
  );
}
