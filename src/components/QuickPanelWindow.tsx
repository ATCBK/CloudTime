import { useEffect, useMemo, useState } from "react";
import { ExplosiveGrowthCard } from "./ExplosiveGrowthCard";
import { formatExplosiveCardTitle, getIncompleteTodoIds } from "./explosiveGrowthCardModel";
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

  const title = useMemo(() => formatExplosiveCardTitle(new Date()), []);

  return (
    <ExplosiveGrowthCard
      title={title}
      items={items.map((item) => ({
        id: item.todoId,
        title: item.title,
        completed: item.completed,
        meta: `${formatTime(item.startHour, item.startMinute)}-${formatTime(item.endHour, item.endMinute)}`
      }))}
      emptyText="今日暂无任务"
      onToggleItem={(todoId) => {
        void window.cloudo.toggleQuickPanelTask(todoId);
      }}
      onCompleteAll={() => {
        for (const todoId of getIncompleteTodoIds(items)) {
          void window.cloudo.toggleQuickPanelTask(todoId);
        }
      }}
    />
  );
}
