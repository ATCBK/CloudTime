import { DragEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from "react";
import { TimelineItem, TodoItem } from "../types";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { MarkdownPreview } from "./MarkdownPreview";

interface TimeManagerPageProps {
  todos: TodoItem[];
  timelineItems: TimelineItem[];
}

type CalendarView = "day" | "week" | "month";

interface PaneWidths {
  left: number;
  middle: number;
  right: number;
}

interface ScheduledItem extends TimelineItem {
  date: string;
}

interface PositionedTimelineItem extends ScheduledItem {
  lane: number;
  laneCount: number;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);
const START_HOUR = 8;
const PIXELS_PER_HOUR = 56;
const TOTAL_MINUTES = HOURS.length * 60;
const MIN_ITEM_MINUTES = 15;
const MIN_CARD_WIDTH = 120;
const MIN_LEFT_PANE = 18;
const MIN_MIDDLE_PANE = 34;
const MIN_RIGHT_PANE = 18;
const TIMELINE_PADDING = 8;
const LANE_GAP = 6;

function toMinutes(hour: number, minute: number): number {
  return (hour - START_HOUR) * 60 + minute;
}

function toClock(totalMinutes: number): { hour: number; minute: number } {
  const minutesFromStart = Math.max(0, Math.min(TOTAL_MINUTES - 1, totalMinutes));
  const hour = START_HOUR + Math.floor(minutesFromStart / 60);
  const minute = minutesFromStart % 60;
  return { hour, minute };
}

function formatTime(hour: number, minute: number): string {
  return `${hour}:${minute.toString().padStart(2, "0")}`;
}

function generateId(): string {
  if ("randomUUID" in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getWeekDates(selectedDate: Date): Date[] {
  const day = selectedDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = addDays(selectedDate, mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function getMonthGrid(selectedDate: Date): Date[] {
  const first = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const startOffset = first.getDay() === 0 ? -6 : 1 - first.getDay();
  const start = addDays(first, startOffset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function layoutWithLanes(items: ScheduledItem[]): PositionedTimelineItem[] {
  const sorted = [...items].sort((a, b) => {
    const aStart = toMinutes(a.startHour, a.startMinute);
    const bStart = toMinutes(b.startHour, b.startMinute);
    if (aStart !== bStart) return aStart - bStart;
    const aEnd = toMinutes(a.endHour, a.endMinute);
    const bEnd = toMinutes(b.endHour, b.endMinute);
    return aEnd - bEnd;
  });

  const result: PositionedTimelineItem[] = [];
  let cluster: ScheduledItem[] = [];
  let clusterEnd = -1;

  const flushCluster = (clusterItems: ScheduledItem[]): void => {
    if (clusterItems.length === 0) return;

    const laneEnds: number[] = [];
    const placed: Array<{ item: ScheduledItem; lane: number }> = [];

    for (const item of clusterItems) {
      const start = toMinutes(item.startHour, item.startMinute);
      const end = toMinutes(item.endHour, item.endMinute);

      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }
      placed.push({ item, lane });
    }

    const laneCount = Math.max(1, laneEnds.length);
    placed.forEach(({ item, lane }) => result.push({ ...item, lane, laneCount }));
  };

  for (const item of sorted) {
    const start = toMinutes(item.startHour, item.startMinute);
    const end = toMinutes(item.endHour, item.endMinute);

    if (cluster.length === 0) {
      cluster = [item];
      clusterEnd = end;
      continue;
    }

    if (start < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd, end);
      continue;
    }

    flushCluster(cluster);
    cluster = [item];
    clusterEnd = end;
  }

  flushCluster(cluster);
  return result;
}

export function TimeManagerPage({ todos, timelineItems }: TimeManagerPageProps): JSX.Element {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);
  const [calendarView, setCalendarView] = useLocalStorageState<CalendarView>("cloudo.time.calendarView", "day");
  const [selectedDateKey, setSelectedDateKey] = useLocalStorageState<string>("cloudo.time.selectedDateKey", todayKey);

  const [todosState, setTodosState] = useLocalStorageState<TodoItem[]>("cloudo.time.todos", todos);
  const [newTodoTitle, setNewTodoTitle] = useState<string>("");
  const [newTodoProject, setNewTodoProject] = useLocalStorageState<string>("cloudo.time.newTodoProject", "默认项目");
  const [newTodoDuration, setNewTodoDuration] = useLocalStorageState<number>("cloudo.time.newTodoDuration", 60);

  const [scheduledItems, setScheduledItems] = useLocalStorageState<ScheduledItem[]>("cloudo.time.scheduledItems",
    timelineItems.map((item) => ({ ...item, date: formatDateKey(today) }))
  );

  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<{ start: number; end: number; title: string } | null>(null);
  const [paneWidths, setPaneWidths] = useLocalStorageState<PaneWidths>("cloudo.time.paneWidths", { left: 24, middle: 46, right: 30 });
  const [lightNote, setLightNote] = useLocalStorageState<string>("cloudo.time.lightNote", "# 当天轻笔记\n\n- 记录关键事项\n- 记录排程中的想法\n");
  const [noteMode, setNoteMode] = useLocalStorageState<"edit" | "preview">("cloudo.time.noteMode", "edit");
  const [timelineWidth, setTimelineWidth] = useState<number>(0);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  const paneRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ divider: 0 | 1; startX: number; start: PaneWidths } | null>(null);
  const moveTaskRef = useRef<{ itemId: string; offsetMinutes: number; durationMinutes: number } | null>(null);

  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const monthDates = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);

  const todosById = useMemo(() => new Map(todosState.map((todo) => [todo.id, todo])), [todosState]);
  const selectedDateItems = useMemo(
    () => scheduledItems.filter((item) => item.date === selectedDateKey),
    [scheduledItems, selectedDateKey]
  );
  const positionedItems = useMemo(() => layoutWithLanes(selectedDateItems), [selectedDateItems]);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent): void => {
      const currentResize = resizingRef.current;
      if (!currentResize || !paneRef.current) return;

      const width = paneRef.current.clientWidth;
      if (width <= 0) return;

      const deltaPercent = ((event.clientX - currentResize.startX) / width) * 100;
      const start = currentResize.start;

      if (currentResize.divider === 0) {
        const left = Math.max(MIN_LEFT_PANE, Math.min(start.left + deltaPercent, 100 - MIN_MIDDLE_PANE - start.right));
        const middle = 100 - left - start.right;
        setPaneWidths({ left, middle, right: start.right });
        return;
      }

      const right = Math.max(MIN_RIGHT_PANE, Math.min(start.right - deltaPercent, 100 - MIN_LEFT_PANE - start.middle));
      const middle = 100 - start.left - right;
      setPaneWidths({ left: start.left, middle, right });
    };

    const onMouseUp = (): void => {
      resizingRef.current = null;
      document.body.classList.remove("resizing-active");
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    const onMouseMove = (event: MouseEvent): void => {
      if (!moveTaskRef.current || !timelineRef.current) return;

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const relativeY = event.clientY - timelineRect.top + timelineRef.current.scrollTop;
      const pointerMinute = Math.round((Math.max(0, Math.min(relativeY, HOURS.length * PIXELS_PER_HOUR)) / PIXELS_PER_HOUR) * 60);

      const { itemId, offsetMinutes, durationMinutes } = moveTaskRef.current;
      const rawStart = pointerMinute - offsetMinutes;
      const boundedStart = Math.max(0, Math.min(TOTAL_MINUTES - durationMinutes, rawStart));
      const boundedEnd = boundedStart + durationMinutes;
      const startClock = toClock(boundedStart);
      const endClock = toClock(boundedEnd);

      setScheduledItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                startHour: startClock.hour,
                startMinute: startClock.minute,
                endHour: endClock.hour,
                endMinute: endClock.minute
              }
            : item
        )
      );
    };

    const onMouseUp = (): void => {
      if (!moveTaskRef.current) return;
      moveTaskRef.current = null;
      setMovingItemId(null);
      document.body.classList.remove("moving-task-active");
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!timelineRef.current) return;

    const observer = new ResizeObserver(() => {
      if (!timelineRef.current) return;
      setTimelineWidth(timelineRef.current.clientWidth);
    });

    observer.observe(timelineRef.current);
    setTimelineWidth(timelineRef.current.clientWidth);

    return () => observer.disconnect();
  }, []);

  const startResize = (divider: 0 | 1) => (event: ReactMouseEvent<HTMLDivElement>): void => {
    resizingRef.current = { divider, startX: event.clientX, start: paneWidths };
    document.body.classList.add("resizing-active");
  };

  const addTodo = (): void => {
    const title = newTodoTitle.trim();
    if (!title) return;
    setTodosState((prev) => [
      {
        id: generateId(),
        title,
        project: newTodoProject.trim() || "默认项目",
        durationMinutes: Math.max(15, newTodoDuration),
        completed: false
      },
      ...prev
    ]);
    setNewTodoTitle("");
  };

  const toggleTodo = (id: string): void => {
    setTodosState((prev) => prev.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const deleteTodo = (id: string): void => {
    setTodosState((prev) => prev.filter((todo) => todo.id !== id));
  };

  const createScheduleFromTodo = (todo: TodoItem, dateKey: string, startMinute: number): void => {
    const duration = Math.max(MIN_ITEM_MINUTES, todo.durationMinutes);
    const boundedStart = Math.max(0, Math.min(TOTAL_MINUTES - duration, startMinute));
    const endMinute = boundedStart + duration;
    const start = toClock(boundedStart);
    const end = toClock(endMinute);

    setScheduledItems((prev) => [
      ...prev,
      {
        id: generateId(),
        todoId: todo.id,
        title: todo.title,
        project: todo.project,
        startHour: start.hour,
        startMinute: start.minute,
        endHour: end.hour,
        endMinute: end.minute,
        date: dateKey
      }
    ]);
  };

  const calculateRangeFromPointer = (event: DragEvent<HTMLDivElement>): { start: number; end: number } | null => {
    if (!timelineRef.current || !draggingTodoId) return null;
    const todo = todosById.get(draggingTodoId);
    if (!todo) return null;

    const rect = timelineRef.current.getBoundingClientRect();
    const relativeY = event.clientY - rect.top + timelineRef.current.scrollTop;
    const clampedY = Math.max(0, Math.min(relativeY, HOURS.length * PIXELS_PER_HOUR));
    const startMinute = Math.round((clampedY / PIXELS_PER_HOUR) * 60);
    const duration = Math.max(MIN_ITEM_MINUTES, todo.durationMinutes);
    const maxStart = TOTAL_MINUTES - duration;
    const boundedStart = Math.max(0, Math.min(maxStart, startMinute));
    return { start: boundedStart, end: boundedStart + duration };
  };

  const handleTodoDragStart = (event: DragEvent<HTMLLIElement>, todoId: string): void => {
    const todo = todosById.get(todoId);
    if (!todo) return;

    const ghost = document.createElement("div");
    ghost.className = "todo-drag-ghost";
    ghost.textContent = `${todo.title} (${todo.durationMinutes}分钟)`;
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 12, 12);
    setTimeout(() => ghost.remove(), 0);

    event.dataTransfer.setData("application/x-cloudo-todo-id", todoId);
    event.dataTransfer.effectAllowed = "copy";
    setDraggingTodoId(todoId);
  };

  const handleTodoDragEnd = (): void => {
    setDraggingTodoId(null);
    setDropPreview(null);
  };

  const handleTimelineDragOver = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";

    const range = calculateRangeFromPointer(event);
    if (!range || !draggingTodoId) {
      setDropPreview(null);
      return;
    }

    const todo = todosById.get(draggingTodoId);
    if (!todo) return;
    setDropPreview({ ...range, title: todo.title });
  };

  const handleTimelineDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const todoId = event.dataTransfer.getData("application/x-cloudo-todo-id") || draggingTodoId;
    if (!todoId) return;

    const todo = todosById.get(todoId);
    if (!todo) return;

    const range = calculateRangeFromPointer(event);
    if (!range) return;

    createScheduleFromTodo(todo, selectedDateKey, range.start);
    setDropPreview(null);
    setDraggingTodoId(null);
  };

  const dropTodoToDate = (event: DragEvent<HTMLElement>, dateKey: string): void => {
    event.preventDefault();
    const todoId = event.dataTransfer.getData("application/x-cloudo-todo-id") || draggingTodoId;
    if (!todoId) return;
    const todo = todosById.get(todoId);
    if (!todo) return;

    createScheduleFromTodo(todo, dateKey, 60);
    setDraggingTodoId(null);
    setDropPreview(null);
  };

  const handleTimelineItemMouseDown = (event: ReactMouseEvent<HTMLElement>, item: ScheduledItem): void => {
    if (!timelineRef.current) return;
    event.preventDefault();
    event.stopPropagation();

    const timelineRect = timelineRef.current.getBoundingClientRect();
    const relativeY = event.clientY - timelineRect.top + timelineRef.current.scrollTop;
    const pointerMinute = Math.round((Math.max(0, Math.min(relativeY, HOURS.length * PIXELS_PER_HOUR)) / PIXELS_PER_HOUR) * 60);
    const itemStartMinute = toMinutes(item.startHour, item.startMinute);
    const itemEndMinute = toMinutes(item.endHour, item.endMinute);
    const durationMinutes = Math.max(MIN_ITEM_MINUTES, itemEndMinute - itemStartMinute);

    moveTaskRef.current = {
      itemId: item.id,
      offsetMinutes: pointerMinute - itemStartMinute,
      durationMinutes
    };
    setMovingItemId(item.id);
    document.body.classList.add("moving-task-active");
  };

  const removeSchedule = (scheduleId: string): void => {
    setScheduledItems((prev) => prev.filter((item) => item.id !== scheduleId));
  };

  const timelineUsableWidth = Math.max(MIN_CARD_WIDTH, timelineWidth - TIMELINE_PADDING * 2);

  return (
    <section className="page">
      <header className="topbar">
        <h2>时间管理</h2>
        <div className="view-switcher">
          <button type="button" className={calendarView === "day" ? "chip active" : "chip"} onClick={() => setCalendarView("day")}>日视图</button>
          <button type="button" className={calendarView === "week" ? "chip active" : "chip"} onClick={() => setCalendarView("week")}>周视图</button>
          <button type="button" className={calendarView === "month" ? "chip active" : "chip"} onClick={() => setCalendarView("month")}>月视图</button>
        </div>
      </header>

      <div
        ref={paneRef}
        className="three-pane"
        style={{ gridTemplateColumns: `${paneWidths.left}% 8px ${paneWidths.middle}% 8px ${paneWidths.right}%` }}
      >
        <section className="panel left">
          <div className="panel-title-row">
            <h3>待办</h3>
          </div>

          <div className="todo-create-form">
            <input value={newTodoTitle} onChange={(e) => setNewTodoTitle(e.target.value)} placeholder="输入待办标题" />
            <input value={newTodoProject} onChange={(e) => setNewTodoProject(e.target.value)} placeholder="项目名" />
            <input
              type="number"
              min={15}
              step={15}
              value={newTodoDuration}
              onChange={(e) => setNewTodoDuration(Number(e.target.value) || 60)}
              placeholder="时长(分钟)"
            />
            <button className="accent-btn" type="button" onClick={addTodo}>新建待办</button>
          </div>

          <ul className="todo-list">
            {todosState.map((todo) => (
              <li
                key={todo.id}
                className={draggingTodoId === todo.id ? "todo-card dragging" : todo.completed ? "todo-card done" : "todo-card"}
                draggable
                onDragStart={(event) => handleTodoDragStart(event, todo.id)}
                onDragEnd={handleTodoDragEnd}
              >
                <p className="todo-title">{todo.title}</p>
                <p className="todo-meta">{todo.project}</p>
                <p className="todo-meta">{todo.durationMinutes} 分钟</p>
                <div className="todo-actions">
                  <button type="button" onClick={() => toggleTodo(todo.id)}>{todo.completed ? "恢复" : "完成"}</button>
                  <button type="button" onClick={() => deleteTodo(todo.id)}>删除</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="pane-resizer" onMouseDown={startResize(0)} role="separator" aria-label="调整左栏和中栏宽度" />

        <section className="panel middle">
          <div className="panel-title-row">
            <h3>{calendarView === "day" ? "日程时间轴" : calendarView === "week" ? "周视图" : "月视图"}</h3>
            <span className="soft-text">当前日期: {selectedDateKey}</span>
          </div>

          {calendarView === "day" ? (
            <div ref={timelineRef} className={dropPreview ? "timeline drop-active" : "timeline"} onDragOver={handleTimelineDragOver} onDrop={handleTimelineDrop}>
              {HOURS.map((hour) => (
                <div key={hour} className="timeline-row" />
              ))}

              {positionedItems.map((item) => {
                const start = toMinutes(item.startHour, item.startMinute);
                const end = toMinutes(item.endHour, item.endMinute);
                const laneWidth = Math.max(MIN_CARD_WIDTH, (timelineUsableWidth - (item.laneCount - 1) * LANE_GAP) / item.laneCount);

                return (
                  <article
                    key={item.id}
                    className={movingItemId === item.id ? "timeline-card moving" : "timeline-card"}
                    onMouseDown={(event) => handleTimelineItemMouseDown(event, item)}
                    style={{
                      top: `${(start / 60) * PIXELS_PER_HOUR}px`,
                      height: `${(Math.max(MIN_ITEM_MINUTES, end - start) / 60) * PIXELS_PER_HOUR}px`,
                      left: `${TIMELINE_PADDING + item.lane * (laneWidth + LANE_GAP)}px`,
                      width: `${laneWidth}px`
                    }}
                  >
                    <p className="timeline-title">{item.title}</p>
                    <p className="timeline-meta">{formatTime(item.startHour, item.startMinute)} - {formatTime(item.endHour, item.endMinute)}</p>
                    <button type="button" className="tiny-btn" onMouseDown={(e) => e.stopPropagation()} onClick={() => removeSchedule(item.id)}>移除</button>
                  </article>
                );
              })}

              {dropPreview ? (
                <article
                  className="timeline-card drop-preview"
                  style={{
                    top: `${(dropPreview.start / 60) * PIXELS_PER_HOUR}px`,
                    height: `${((dropPreview.end - dropPreview.start) / 60) * PIXELS_PER_HOUR}px`,
                    left: `${TIMELINE_PADDING}px`,
                    width: `${Math.min(280, Math.max(MIN_CARD_WIDTH, timelineUsableWidth * 0.6))}px`
                  }}
                >
                  <p className="timeline-title">{dropPreview.title}</p>
                </article>
              ) : null}

              <div className="now-line" />
            </div>
          ) : null}

          {calendarView === "week" ? (
            <div className="week-grid">
              {weekDates.map((date) => {
                const key = formatDateKey(date);
                const items = scheduledItems.filter((it) => it.date === key);
                return (
                  <section
                    key={key}
                    className="week-cell"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => dropTodoToDate(e, key)}
                  >
                    <button type="button" className="week-date-btn" onClick={() => { setSelectedDateKey(key); setCalendarView("day"); }}>{key.slice(5)}</button>
                    <div className="week-items">
                      {items.map((it) => (
                        <article key={it.id} className="week-item">
                          <span>{it.title}</span>
                          <span className="soft-text">{formatTime(it.startHour, it.startMinute)}</span>
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}

          {calendarView === "month" ? (
            <div className="month-grid">
              {monthDates.map((date) => {
                const key = formatDateKey(date);
                const items = scheduledItems.filter((it) => it.date === key);
                const inCurrentMonth = date.getMonth() === selectedDate.getMonth();
                return (
                  <section
                    key={key}
                    className={inCurrentMonth ? "month-cell" : "month-cell muted"}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => dropTodoToDate(e, key)}
                  >
                    <button type="button" className="month-date-btn" onClick={() => { setSelectedDateKey(key); setCalendarView("day"); }}>{date.getDate()}</button>
                    <p className="soft-text">{items.length} 个任务</p>
                  </section>
                );
              })}
            </div>
          ) : null}
        </section>

        <div className="pane-resizer" onMouseDown={startResize(1)} role="separator" aria-label="调整中栏和右栏宽度" />

        <section className="panel right light-note-panel">
          <div className="note-toolbar">
            <span className="soft-text">轻笔记（Markdown）</span>
            <div className="note-mode-switch">
              <button type="button" className={noteMode === "edit" ? "chip active" : "chip"} onClick={() => setNoteMode("edit")}>编辑</button>
              <button type="button" className={noteMode === "preview" ? "chip active" : "chip"} onClick={() => setNoteMode("preview")}>预览</button>
            </div>
          </div>

          {noteMode === "edit" ? (
            <textarea className="md-note-input" value={lightNote} onChange={(event) => setLightNote(event.target.value)} />
          ) : (
            <MarkdownPreview className="md-preview" content={lightNote} />
          )}
        </section>
      </div>
    </section>
  );
}





