import { useEffect, useMemo, useState } from "react";
import { QuickPanelItem } from "./quickPanelState";

function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function QuickPanelWindow(): JSX.Element {
  const [items, setItems] = useState<QuickPanelItem[]>([]);

  useEffect(() => {
    document.body.classList.add("quick-panel-window-view");
    return () => document.body.classList.remove("quick-panel-window-view");
  }, []);

  useEffect(() => {
    const unsubscribe = window.cloudo.onQuickPanelState((next) => {
      setItems(Array.isArray(next) ? next : []);
    });
    return unsubscribe;
  }, []);

  const title = useMemo(() => {
    const date = new Date();
    return `${date.getMonth() + 1}月${date.getDate()}日任务`;
  }, []);

  return (
    <section className="desktop-quick-panel-shell">
      <article className="desktop-quick-panel">
        <header className="desktop-quick-panel-head">
          <h2>{title}</h2>
        </header>

        <div className="desktop-quick-panel-list">
          {items.length === 0 ? <p className="desktop-quick-panel-empty">今日暂无任务</p> : null}
          {items.map((item) => (
            <label key={item.scheduleId} className={item.completed ? "desktop-quick-item done" : "desktop-quick-item"}>
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => {
                  void window.cloudo.toggleQuickPanelTask(item.todoId);
                }}
              />
              <div className="desktop-quick-item-main">
                <span className="desktop-quick-item-title">{item.title}</span>
                <span className="desktop-quick-item-meta">
                  {formatTime(item.startHour, item.startMinute)}-{formatTime(item.endHour, item.endMinute)} · {item.project}
                </span>
                {item.details.trim() ? <span className="desktop-quick-item-detail">{item.details}</span> : null}
              </div>
            </label>
          ))}
        </div>
      </article>
    </section>
  );
}
