import { AppSettings } from "../types";

interface SettingsPageProps {
  settings: AppSettings;
  onOpacityChange: (value: number) => void;
}

export function SettingsPage({ settings, onOpacityChange }: SettingsPageProps): JSX.Element {
  return (
    <section className="page">
      <header className="topbar">
        <h2>设置</h2>
      </header>

      <div className="settings-grid">
        <section className="panel">
          <h3>外观</h3>
          <label className="settings-row" htmlFor="opacity">
            窗口透明度（默认 100%）
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
        </section>

        <section className="panel">
          <h3>快捷键</h3>
          <p className="soft-text">当前: Alt + Space</p>
        </section>

        <section className="panel">
          <h3>存储</h3>
          <p className="soft-text">Markdown 按项目文件夹管理</p>
        </section>
      </div>
    </section>
  );
}
