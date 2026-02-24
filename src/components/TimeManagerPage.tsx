import { ClipboardEvent as ReactClipboardEvent, DragEvent, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bold, Check, Eye, EyeOff, GripVertical, Italic, Link2, List, RotateCcw, Trash2, X } from "lucide-react";
import { TimelineItem, TodoItem } from "../types";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { resolveInitialLightNoteHtml, sanitizeLightNoteHtml } from "./lightNoteRichText";
import { buildTaskReferenceCardHtml, scheduleToTodoCandidate, toggleTodoCompleted } from "./timeManagerActions";
import { boundRange, computeAutoScrollDelta, pointerToSnappedRange, snapToStep } from "./timeDragMath";
import { buildQuickPanelItems, removeTodoAfterSchedule } from "./quickPanelState";
import { buildHourSlots24, computeMinuteOfDay, computeMsUntilNextMidnight, computeMsUntilTodayRecycle, computeNowLineTop, isSameDateKey, toggleWeekExpandedDate } from "./timeManagerClock";
import { computeLaneWidth, computeTimelineUsableWidth } from "./timelineLayout";
import { getGreetingLabel } from "./timeManagerTheme";
import { canCreateTodo, removeScheduleWithSnapshot, undoRemovedSchedule } from "./timeManagerSafety";

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
  details?: string;
  completed?: boolean;
}

interface PositionedTimelineItem extends ScheduledItem {
  lane: number;
  laneCount: number;
}

const HOURS = buildHourSlots24();
const START_HOUR = 0;
const PIXELS_PER_HOUR = 56;
const TOTAL_MINUTES = HOURS.length * 60;
const MIN_ITEM_MINUTES = 15;
const MIN_CARD_WIDTH = 120;
const MIN_LEFT_PANE = 18;
const MIN_MIDDLE_PANE = 34;
const MIN_RIGHT_PANE = 18;
const TIMELINE_PADDING = 8;
const LANE_GAP = 6;
const SNAP_MINUTES = 15;
const AUTO_SCROLL_EDGE = 56;
const AUTO_SCROLL_SPEED = 20;
const TIMELINE_LABEL_WIDTH = 58;


function toMinutes(hour: number, minute: number): number {
  return (hour - START_HOUR) * 60 + minute;
}

function toClock(totalMinutes: number): { hour: number; minute: number } {
  const minutesFromStart = Math.max(0, Math.min(TOTAL_MINUTES, totalMinutes));
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
  const initialNow = useMemo(() => new Date(), []);
  const [currentDateKey, setCurrentDateKey] = useState<string>(formatDateKey(initialNow));
  const [nowMinute, setNowMinute] = useState<number>(computeMinuteOfDay(initialNow));
  const initialTodoById = useMemo(() => new Map(todos.map((todo) => [todo.id, todo])), [todos]);
  const [calendarView, setCalendarView] = useLocalStorageState<CalendarView>("cloudo.time.calendarView", "day");
  const [selectedDateKey, setSelectedDateKey] = useLocalStorageState<string>("cloudo.time.selectedDateKey", formatDateKey(initialNow));

  const [todosState, setTodosState] = useLocalStorageState<TodoItem[]>("cloudo.time.todos", todos);
  const [newTodoTitle, setNewTodoTitle] = useState<string>("");
  const [newTodoDetail, setNewTodoDetail] = useState<string>("");
  const [newTodoProject, setNewTodoProject] = useLocalStorageState<string>("cloudo.time.newTodoProject", "默认项目");
  const [newTodoDuration, setNewTodoDuration] = useLocalStorageState<number>("cloudo.time.newTodoDuration", 60);

  const [scheduledItems, setScheduledItems] = useLocalStorageState<ScheduledItem[]>("cloudo.time.scheduledItems",
    timelineItems.map((item) => ({
      ...item,
      date: formatDateKey(initialNow),
      details: initialTodoById.get(item.todoId)?.details ?? "",
      completed: initialTodoById.get(item.todoId)?.completed ?? false
    }))
  );

  const [draggingTodoId, setDraggingTodoId] = useState<string | null>(null);
  const [draggingScheduleId, setDraggingScheduleId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<{ start: number; end: number; title: string } | null>(null);
  const [paneWidths, setPaneWidths] = useLocalStorageState<PaneWidths>("cloudo.time.paneWidths", { left: 24, middle: 46, right: 30 });
  const [lightNoteHtml, setLightNoteHtml] = useLocalStorageState<string>("cloudo.time.lightNoteHtml", "");
  const [timelineWidth, setTimelineWidth] = useState<number>(0);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [openedTodoDetailId, setOpenedTodoDetailId] = useState<string | null>(null);
  const [openedScheduleDetailId, setOpenedScheduleDetailId] = useState<string | null>(null);
  const [expandedWeekDateKey, setExpandedWeekDateKey] = useState<string | null>(null);
  const [removedScheduleSnapshot, setRemovedScheduleSnapshot] = useState<ScheduledItem | null>(null);
  const [showUndoBar, setShowUndoBar] = useState<boolean>(false);
  const [pendingDeleteScheduleId, setPendingDeleteScheduleId] = useState<string | null>(null);

  const paneRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ divider: 0 | 1; startX: number; start: PaneWidths } | null>(null);
  const moveTaskRef = useRef<{ itemId: string; offsetMinutes: number; durationMinutes: number } | null>(null);
  const lightNoteEditorRef = useRef<HTMLDivElement>(null);
  const quickCreateTitleRef = useRef<HTMLInputElement>(null);
  const undoTimerRef = useRef<number | null>(null);

  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const monthDates = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);

  const todosById = useMemo(() => new Map(todosState.map((todo) => [todo.id, todo])), [todosState]);
  const selectedDateItems = useMemo(
    () => scheduledItems.filter((item) => item.date === selectedDateKey),
    [scheduledItems, selectedDateKey]
  );
  const positionedItems = useMemo(() => layoutWithLanes(selectedDateItems), [selectedDateItems]);
  const quickPanelItems = useMemo(() => buildQuickPanelItems(scheduledItems, todosState, currentDateKey), [scheduledItems, todosState, currentDateKey]);
  const pendingDeleteSchedule = useMemo(
    () => (pendingDeleteScheduleId ? scheduledItems.find((item) => item.id === pendingDeleteScheduleId) ?? null : null),
    [pendingDeleteScheduleId, scheduledItems]
  );

  useEffect(() => {
    if (lightNoteHtml.trim()) return;

    let legacyMarkdown: string | null = null;
    try {
      const legacyRaw = window.localStorage.getItem("cloudo.time.lightNote");
      if (legacyRaw !== null) {
        const parsed = JSON.parse(legacyRaw);
        if (typeof parsed === "string") legacyMarkdown = parsed;
      }
    } catch {
      // Ignore malformed legacy storage.
    }

    const initialHtml = resolveInitialLightNoteHtml("", legacyMarkdown);
    setLightNoteHtml(initialHtml);
  }, [lightNoteHtml, setLightNoteHtml]);

  useEffect(() => {
    if (!lightNoteEditorRef.current) return;
    if (lightNoteEditorRef.current.innerHTML !== lightNoteHtml) {
      lightNoteEditorRef.current.innerHTML = lightNoteHtml;
    }
  }, [lightNoteHtml]);

  const runLightNoteCommand = (command: string, value?: string): void => {
    if (!lightNoteEditorRef.current) return;
    lightNoteEditorRef.current.focus({ preventScroll: true });
    document.execCommand(command, false, value);
    setLightNoteHtml(sanitizeLightNoteHtml(lightNoteEditorRef.current.innerHTML));
  };

  const insertLightNoteLink = (): void => {
    const url = window.prompt("输入链接地址", "https://");
    if (!url) return;
    runLightNoteCommand("createLink", url);
  };

  const handleLightNotePaste = (event: ReactClipboardEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");

    if (html) document.execCommand("insertHTML", false, sanitizeLightNoteHtml(html));
    else if (text) document.execCommand("insertText", false, text);

    if (!lightNoteEditorRef.current) return;
    setLightNoteHtml(sanitizeLightNoteHtml(lightNoteEditorRef.current.innerHTML));
  };

  useEffect(() => {
    const unsubscribe = window.cloudo.onQuickPanelToggleTask((todoId) => {
      const target = quickPanelItems.find((item) => item.todoId === todoId);
      const nextCompleted = !(target?.completed ?? false);

      setTodosState((prev) =>
        prev.map((todo) => (todo.id === todoId ? { ...todo, completed: nextCompleted } : todo))
      );
      setScheduledItems((prev) =>
        prev.map((item) => (item.todoId === todoId ? { ...item, completed: nextCompleted } : item))
      );
    });
    return unsubscribe;
  }, [quickPanelItems, setScheduledItems, setTodosState]);

  useEffect(() => {
    void window.cloudo.updateQuickPanelState(quickPanelItems);
  }, [quickPanelItems]);

  useEffect(() => {
    const today = formatDateKey(new Date());
    setCurrentDateKey(today);
    setSelectedDateKey(today);
  }, [setSelectedDateKey]);

  useEffect(() => {
    const focusCreate = (): void => {
      requestAnimationFrame(() => {
        quickCreateTitleRef.current?.focus();
      });
    };

    const onCustomFocus = (): void => focusCreate();
    window.addEventListener("cloudo:focusQuickCreate", onCustomFocus);

    return () => {
      window.removeEventListener("cloudo:focusQuickCreate", onCustomFocus);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!pendingDeleteScheduleId) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setPendingDeleteScheduleId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingDeleteScheduleId]);

  const scrollTimelineToMinute = useCallback((minuteOfDay: number, behavior: ScrollBehavior = "smooth"): void => {
    if (!timelineRef.current) return;
    const targetTop = computeNowLineTop(minuteOfDay, PIXELS_PER_HOUR) - timelineRef.current.clientHeight * 0.28;
    const max = Math.max(0, timelineRef.current.scrollHeight - timelineRef.current.clientHeight);
    const next = Math.max(0, Math.min(max, targetTop));
    timelineRef.current.scrollTo({ top: next, behavior });
  }, []);

  useEffect(() => {
    const tick = (): void => {
      const now = new Date();
      setNowMinute(computeMinuteOfDay(now));
      setCurrentDateKey(formatDateKey(now));
    };

    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let timer = 0;
    const schedule = (): void => {
      const now = new Date();
      const wait = computeMsUntilNextMidnight(now) + 24;
      timer = window.setTimeout(() => {
        const freshNow = new Date();
        const today = formatDateKey(freshNow);
        setCurrentDateKey(today);
        setNowMinute(computeMinuteOfDay(freshNow));
        setSelectedDateKey(today);
        if (calendarView === "day") {
          requestAnimationFrame(() => scrollTimelineToMinute(computeMinuteOfDay(freshNow), "smooth"));
        }
        schedule();
      }, wait);
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, [calendarView, scrollTimelineToMinute, setSelectedDateKey]);

  useEffect(() => {
    let timer = 0;

    const recycleTodayUnfinished = (): void => {
      const today = formatDateKey(new Date());
      const recycled: ScheduledItem[] = [];

      setScheduledItems((prev) =>
        prev.filter((item) => {
          const completed = item.completed ?? false;
          const shouldRecycle = isSameDateKey(item.date, today) && !completed;
          if (shouldRecycle) recycled.push(item);
          return !shouldRecycle;
        })
      );

      if (recycled.length === 0) return;

      setTodosState((prev) => {
        const next = [...prev];
        for (const source of recycled) {
          const idx = next.findIndex((todo) => todo.id === source.todoId || (todo.title === source.title && todo.project === source.project));
          const candidate = scheduleToTodoCandidate(source);
          if (idx >= 0) {
            next[idx] = { ...next[idx], durationMinutes: candidate.durationMinutes, details: candidate.details, completed: false };
          } else {
            next.unshift({ ...candidate, id: source.todoId || generateId() });
          }
        }
        return next;
      });
    };

    const scheduleRecycle = (): void => {
      const now = new Date();
      const wait = computeMsUntilTodayRecycle(now);
      timer = window.setTimeout(() => {
        recycleTodayUnfinished();
        scheduleRecycle();
      }, wait);
    };

    scheduleRecycle();
    return () => window.clearTimeout(timer);
  }, [setScheduledItems, setTodosState]);

  useEffect(() => {
    if (calendarView !== "day") return;
    if (!isSameDateKey(selectedDateKey, currentDateKey)) return;
    scrollTimelineToMinute(nowMinute, "smooth");
  }, [calendarView, currentDateKey, nowMinute, scrollTimelineToMinute, selectedDateKey]);


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
      const pointerY = event.clientY - timelineRect.top;
      const autoScroll = computeAutoScrollDelta(pointerY, timelineRect.height, AUTO_SCROLL_EDGE, AUTO_SCROLL_SPEED);
      if (autoScroll !== 0) {
        const maxScrollTop = Math.max(0, timelineRef.current.scrollHeight - timelineRef.current.clientHeight);
        timelineRef.current.scrollTop = Math.max(0, Math.min(maxScrollTop, timelineRef.current.scrollTop + autoScroll));
      }

      const relativeY = event.clientY - timelineRect.top + timelineRef.current.scrollTop;
      const pointerMinute = Math.round((Math.max(0, Math.min(relativeY, HOURS.length * PIXELS_PER_HOUR)) / PIXELS_PER_HOUR) * 60);

      const { itemId, offsetMinutes, durationMinutes } = moveTaskRef.current;
      const rawStart = pointerMinute - offsetMinutes;
      const snappedStart = snapToStep(rawStart, SNAP_MINUTES);
      const range = boundRange(snappedStart, durationMinutes, TOTAL_MINUTES);
      const startClock = toClock(range.start);
      const endClock = toClock(range.end);

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
    if (calendarView !== "day") return;
    if (!timelineRef.current) return;

    const syncTimelineWidth = (): void => {
      if (!timelineRef.current) return;
      setTimelineWidth(timelineRef.current.clientWidth);
    };

    const observer = new ResizeObserver(() => {
      syncTimelineWidth();
    });

    observer.observe(timelineRef.current);
    syncTimelineWidth();
    const raf = window.requestAnimationFrame(syncTimelineWidth);
    window.addEventListener("resize", syncTimelineWidth);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", syncTimelineWidth);
      observer.disconnect();
    };
  }, [calendarView, paneWidths.left, paneWidths.middle, paneWidths.right]);

  const startResize = (divider: 0 | 1) => (event: ReactMouseEvent<HTMLDivElement>): void => {
    resizingRef.current = { divider, startX: event.clientX, start: paneWidths };
    document.body.classList.add("resizing-active");
  };

  const addTodo = (): void => {
    const title = newTodoTitle.trim();
    if (!canCreateTodo(title)) return;
    const details = newTodoDetail.trim();
    setTodosState((prev) => [
      {
        id: generateId(),
        title,
        project: newTodoProject.trim() || "默认项目",
        durationMinutes: Math.max(15, newTodoDuration),
        details,
        completed: false
      },
      ...prev
    ]);
    setNewTodoTitle("");
    setNewTodoDetail("");
  };

  const toggleTodo = (id: string): void => {
    setTodosState((prev) => {
      const current = prev.find((todo) => todo.id === id);
      if (!current) return prev;
      const nextCompleted = toggleTodoCompleted(current.completed);
      setScheduledItems((scheduledPrev) =>
        scheduledPrev.map((item) => (item.todoId === id ? { ...item, completed: nextCompleted } : item))
      );
      return prev.map((todo) => (todo.id === id ? { ...todo, completed: nextCompleted } : todo));
    });
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
        date: dateKey,
        details: todo.details ?? "",
        completed: todo.completed
      }
    ]);
  };

  const calculateRangeFromPointer = (event: DragEvent<HTMLDivElement>): { start: number; end: number } | null => {
    if (!timelineRef.current || !draggingTodoId) return null;
    const todo = todosById.get(draggingTodoId);
    if (!todo) return null;

    const rect = timelineRef.current.getBoundingClientRect();
    const relativeY = event.clientY - rect.top + timelineRef.current.scrollTop;
    const duration = Math.max(MIN_ITEM_MINUTES, todo.durationMinutes);
    return pointerToSnappedRange(relativeY, duration, TOTAL_MINUTES, PIXELS_PER_HOUR, SNAP_MINUTES);
  };

  const maybeAutoScrollTimeline = (clientY: number): void => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pointerY = clientY - rect.top;
    const delta = computeAutoScrollDelta(pointerY, rect.height, AUTO_SCROLL_EDGE, AUTO_SCROLL_SPEED);
    if (delta === 0) return;

    const maxScrollTop = Math.max(0, timelineRef.current.scrollHeight - timelineRef.current.clientHeight);
    timelineRef.current.scrollTop = Math.max(0, Math.min(maxScrollTop, timelineRef.current.scrollTop + delta));
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
    maybeAutoScrollTimeline(event.clientY);

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
    setTodosState((prev) => removeTodoAfterSchedule(prev, todo.id));
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
    setTodosState((prev) => removeTodoAfterSchedule(prev, todo.id));
    setDraggingTodoId(null);
    setDropPreview(null);
  };

  const handleScheduleDragStart = (event: DragEvent<HTMLButtonElement>, item: ScheduledItem): void => {
    event.dataTransfer.setData("application/x-cloudo-schedule-id", item.id);
    event.dataTransfer.effectAllowed = "copyMove";
    setDraggingScheduleId(item.id);
  };

  const handleScheduleDragEnd = (): void => {
    setDraggingScheduleId(null);
  };

  const dropScheduleToTodoPool = (event: DragEvent<HTMLElement>): void => {
    event.preventDefault();
    const scheduleId = event.dataTransfer.getData("application/x-cloudo-schedule-id") || draggingScheduleId;
    if (!scheduleId) return;

    const source = scheduledItems.find((item) => item.id === scheduleId);
    if (!source) return;

    setScheduledItems((prev) => prev.filter((item) => item.id !== scheduleId));
    setDraggingScheduleId(null);

    setTodosState((prev) => {
      const idx = prev.findIndex((todo) => todo.id === source.todoId || (todo.title === source.title && todo.project === source.project));
      const todoCandidate = scheduleToTodoCandidate(source);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          durationMinutes: todoCandidate.durationMinutes,
          details: todoCandidate.details,
          completed: false
        };
        return next;
      }

      return [{ ...todoCandidate, id: source.todoId || generateId() }, ...prev];
    });
  };

  const insertTaskCardToLightNote = (item: ScheduledItem): void => {
    if (!lightNoteEditorRef.current) return;
    const timeLabel = `${formatTime(item.startHour, item.startMinute)} - ${formatTime(item.endHour, item.endMinute)}`;
    const html = buildTaskReferenceCardHtml({
      taskId: item.todoId,
      title: item.title,
      project: item.project,
      timeLabel
    });

    lightNoteEditorRef.current.focus({ preventScroll: true });
    document.execCommand("insertHTML", false, html);
    setLightNoteHtml(sanitizeLightNoteHtml(lightNoteEditorRef.current.innerHTML));
  };

  const handleLightNoteDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const scheduleId = event.dataTransfer.getData("application/x-cloudo-schedule-id") || draggingScheduleId;
    if (!scheduleId) return;
    const source = scheduledItems.find((item) => item.id === scheduleId);
    if (!source) return;

    insertTaskCardToLightNote(source);
    setDraggingScheduleId(null);
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
    setScheduledItems((prev) => {
      const { next, removed } = removeScheduleWithSnapshot(prev, scheduleId);
      if (removed) {
        setRemovedScheduleSnapshot(removed);
        setShowUndoBar(true);
        if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
        undoTimerRef.current = window.setTimeout(() => {
          setShowUndoBar(false);
          setRemovedScheduleSnapshot(null);
          undoTimerRef.current = null;
        }, 5000);
      }
      return next;
    });
  };

  const undoRemoveSchedule = (): void => {
    setScheduledItems((prev) => undoRemovedSchedule(prev, removedScheduleSnapshot));
    setShowUndoBar(false);
    setRemovedScheduleSnapshot(null);
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  const confirmRemoveSchedule = (): void => {
    if (!pendingDeleteScheduleId) return;
    removeSchedule(pendingDeleteScheduleId);
    setPendingDeleteScheduleId(null);
  };

  const timelineUsableWidth = computeTimelineUsableWidth(timelineWidth, TIMELINE_PADDING, TIMELINE_LABEL_WIDTH, MIN_CARD_WIDTH);
  const greetingLabel = useMemo(() => getGreetingLabel(new Date().getHours()), [nowMinute]);

  return (
    <section className="page time-manager-page">
      <header className="topbar time-manager-topbar">
        <div className="tm-hero">
          <h2>时间管理看板</h2>
          <p>{greetingLabel}</p>
        </div>
        <div className="tm-top-right">
          <div className="cardm" aria-label="状态卡片">
            <div className="card">
              <div className="weather">
                <p className="main">专注模式</p>
                <p className="mainsub">保持节奏</p>
              </div>
            </div>
            <div className="card2">
              <div className="upper">
                <div>湿度 56%</div>
                <div>空气 良</div>
              </div>
              <div className="humiditytext">Humidity</div>
              <div className="airtext">Air</div>
              <div className="lower">
                <div className="aqi">AQI 42</div>
                <div className="realfeel">体感 舒适</div>
              </div>
              <div className="card3">今日状态稳定</div>
            </div>
          </div>
        </div>
      </header>

      <div className="tm-toolbar-row">
        <div className="view-switcher tm-view-switcher tm-view-group">
          <button type="button" className={calendarView === "day" ? "chip active" : "chip"} onClick={() => setCalendarView("day")}>日视图</button>
          <button type="button" className={calendarView === "week" ? "chip active" : "chip"} onClick={() => setCalendarView("week")}>周视图</button>
          <button type="button" className={calendarView === "month" ? "chip active" : "chip"} onClick={() => setCalendarView("month")}>月视图</button>
        </div>
      </div>

      <div
        ref={paneRef}
        className="three-pane"
        style={{ gridTemplateColumns: `${paneWidths.left}% 8px ${paneWidths.middle}% 8px ${paneWidths.right}%` }}
      >
        <section
          className={draggingScheduleId ? "panel left tm-left-panel todo-drop-active" : "panel left tm-left-panel"}
          onDragOver={(event) => event.preventDefault()}
          onDrop={dropScheduleToTodoPool}
        >
          <div className="panel-title-row">
            <h3>快速添加任务</h3>
          </div>

          <div className="todo-create-form">
            <input ref={quickCreateTitleRef} value={newTodoTitle} onChange={(e) => setNewTodoTitle(e.target.value)} placeholder="例如：完成开发日报" />
            <input value={newTodoProject} onChange={(e) => setNewTodoProject(e.target.value)} placeholder="项目（如：默认项目）" />
            <input
              type="number"
              min={15}
              step={15}
              value={newTodoDuration}
              onChange={(e) => setNewTodoDuration(Number(e.target.value) || 60)}
              placeholder="时长（分钟，如45）"
            />
            <textarea value={newTodoDetail} onChange={(e) => setNewTodoDetail(e.target.value)} placeholder="详情（可选）" />
            <button className="accent-btn" type="button" onClick={addTodo} disabled={!canCreateTodo(newTodoTitle)}>新建待办</button>
          </div>

          <div className="tm-subtitle-row">
            <h3>待办池</h3>
            <span>{todosState.length} 个任务</span>
          </div>

          {todosState.length === 0 ? (
            <div className="tm-empty-state">
              <p>暂无待办，先创建一条今天要完成的任务。</p>
              <button type="button" className="tiny-btn" onClick={() => quickCreateTitleRef.current?.focus()}>去创建</button>
            </div>
          ) : (
            <ul className="todo-list tm-todo-list">
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
                  <button type="button" title={todo.completed ? "恢复" : "完成"} onClick={() => toggleTodo(todo.id)}>
                    {todo.completed ? <RotateCcw size={14} /> : <Check size={14} />}
                  </button>
                  <button
                    type="button"
                    title={openedTodoDetailId === todo.id ? "收起详情" : "查看详情"}
                    onClick={() => setOpenedTodoDetailId((prev) => (prev === todo.id ? null : todo.id))}
                  >
                    {openedTodoDetailId === todo.id ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button type="button" title="删除" onClick={() => deleteTodo(todo.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                {openedTodoDetailId === todo.id ? (
                  <div className="todo-detail">{todo.details?.trim() ? todo.details : "暂无详情"}</div>
                ) : null}
              </li>
              ))}
            </ul>
          )}
        </section>

        <div className="pane-resizer" onMouseDown={startResize(0)} role="separator" aria-label="调整左栏和中栏宽度" />

        <section className="panel middle tm-middle-panel">
          <div className="panel-title-row">
            <h3>{calendarView === "day" ? "日程计划" : calendarView === "week" ? "周视图" : "月视图"}</h3>
            <span className="soft-text">当前日期: {selectedDateKey}</span>
          </div>

          {calendarView === "day" ? (
            <div ref={timelineRef} className={dropPreview ? "timeline drop-active" : "timeline"} onDragOver={handleTimelineDragOver} onDrop={handleTimelineDrop}>
              {HOURS.map((hour) => (
                <div key={hour} className="timeline-row">
                  <span className="timeline-hour">{`${hour}:00`}</span>
                </div>
              ))}

              {positionedItems.map((item) => {
                const start = toMinutes(item.startHour, item.startMinute);
                const end = toMinutes(item.endHour, item.endMinute);
                const laneWidth = computeLaneWidth(timelineUsableWidth, item.laneCount, LANE_GAP, MIN_CARD_WIDTH);

                return (
                  <article
                    key={item.id}
                    className={movingItemId === item.id ? "timeline-card moving" : "timeline-card"}
                    onMouseDown={(event) => handleTimelineItemMouseDown(event, item)}
                    style={{
                      top: `${(start / 60) * PIXELS_PER_HOUR}px`,
                      height: `${(Math.max(MIN_ITEM_MINUTES, end - start) / 60) * PIXELS_PER_HOUR}px`,
                      left: `${TIMELINE_PADDING + TIMELINE_LABEL_WIDTH + item.lane * (laneWidth + LANE_GAP)}px`,
                      width: `${laneWidth}px`
                    }}
                  >
                    <button
                      type="button"
                      className="timeline-detail-btn"
                      title="详情"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setOpenedScheduleDetailId(item.id)}
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      type="button"
                      className="timeline-remove-btn"
                      title="移除"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setPendingDeleteScheduleId(item.id)}
                    >
                      <X size={13} />
                    </button>
                    <button
                      type="button"
                      className="timeline-drag-handle"
                      title="拖拽到待办或轻笔记"
                      draggable
                      onMouseDown={(e) => e.stopPropagation()}
                      onDragStart={(event) => handleScheduleDragStart(event, item)}
                      onDragEnd={handleScheduleDragEnd}
                    >
                      <GripVertical size={13} />
                    </button>
                    <p className="timeline-title">{item.title}</p>
                    <p className="timeline-meta">{formatTime(item.startHour, item.startMinute)} - {formatTime(item.endHour, item.endMinute)}</p>
                  </article>
                );
              })}

              {dropPreview ? (
                <article
                  className="timeline-card drop-preview"
                  style={{
                    top: `${(dropPreview.start / 60) * PIXELS_PER_HOUR}px`,
                    height: `${((dropPreview.end - dropPreview.start) / 60) * PIXELS_PER_HOUR}px`,
                    left: `${TIMELINE_PADDING + TIMELINE_LABEL_WIDTH}px`,
                    width: `${Math.min(280, Math.max(MIN_CARD_WIDTH, timelineUsableWidth * 0.6))}px`
                  }}
                >
                  <p className="timeline-title">{dropPreview.title}</p>
                  <p className="timeline-meta">
                    {formatTime(toClock(dropPreview.start).hour, toClock(dropPreview.start).minute)} - {formatTime(toClock(dropPreview.end).hour, toClock(dropPreview.end).minute)}
                  </p>
                  <p className="timeline-meta">Drop here</p>
                </article>
              ) : null}

              {selectedDateKey === currentDateKey ? <div className="now-line" style={{ top: `${computeNowLineTop(nowMinute, PIXELS_PER_HOUR)}px` }} /> : null}
            </div>
          ) : null}

          {calendarView === "week" ? (
            <div className="week-grid">
              {weekDates.map((date) => {
                const key = formatDateKey(date);
                const items = scheduledItems
                  .filter((it) => it.date === key)
                  .sort((a, b) => toMinutes(a.startHour, a.startMinute) - toMinutes(b.startHour, b.startMinute));
                const isExpanded = expandedWeekDateKey === key;
                return (
                  <section
                    key={key}
                    className="week-cell"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => dropTodoToDate(e, key)}
                  >
                    <button
                      type="button"
                      className={isExpanded ? "week-date-btn active" : "week-date-btn"}
                      onClick={() => setExpandedWeekDateKey((prev) => toggleWeekExpandedDate(prev, key))}
                    >
                      {key.slice(5)}
                    </button>
                    <p className="soft-text">{items.length} 个任务</p>
                    <div className="week-items">
                      {items.slice(0, 4).map((it) => (
                        <article key={it.id} className="week-item">
                          <span>{it.title}</span>
                          <span className="soft-text">{formatTime(it.startHour, it.startMinute)}-{formatTime(it.endHour, it.endMinute)}</span>
                        </article>
                      ))}
                    </div>
                    {isExpanded ? (
                      <div className="week-expanded-day">
                        {HOURS.map((hour) => (
                          <div key={`${key}-${hour}`} className="week-expanded-row">
                            <span>{`${hour.toString().padStart(2, "0")}:00`}</span>
                          </div>
                        ))}
                        {items.map((it) => {
                          const start = toMinutes(it.startHour, it.startMinute);
                          const end = toMinutes(it.endHour, it.endMinute);
                          return (
                            <article
                              key={`expanded-${it.id}`}
                              className="week-expanded-card"
                              onClick={() => {
                                setSelectedDateKey(key);
                                setCalendarView("day");
                              }}
                              style={{
                                top: `${(start / 60) * 24}px`,
                                height: `${(Math.max(15, end - start) / 60) * 24}px`
                              }}
                            >
                              <span>{it.title}</span>
                            </article>
                          );
                        })}
                      </div>
                    ) : null}
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

        <section className="panel right light-note-panel tm-note-panel">
          <div className="note-toolbar">
            <span className="soft-text tm-note-title">轻笔记</span>
            <div className="light-note-tools">
              <button type="button" className="tiny-btn icon-only" title="加粗" onClick={() => runLightNoteCommand("bold")}>
                <Bold size={14} />
              </button>
              <button type="button" className="tiny-btn icon-only" title="斜体" onClick={() => runLightNoteCommand("italic")}>
                <Italic size={14} />
              </button>
              <button type="button" className="tiny-btn icon-only" title="无序列表" onClick={() => runLightNoteCommand("insertUnorderedList")}>
                <List size={14} />
              </button>
              <button type="button" className="tiny-btn icon-only" title="插入链接" onClick={insertLightNoteLink}>
                <Link2 size={14} />
              </button>
            </div>
          </div>

          <div
            ref={lightNoteEditorRef}
            className={draggingScheduleId ? "md-note-input light-note-editor light-note-scroll note-drop-active" : "md-note-input light-note-editor light-note-scroll"}
            contentEditable
            suppressContentEditableWarning
            onInput={() => {
              if (!lightNoteEditorRef.current) return;
              setLightNoteHtml(sanitizeLightNoteHtml(lightNoteEditorRef.current.innerHTML));
            }}
            onPaste={handleLightNotePaste}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleLightNoteDrop}
          />
        </section>
      </div>

      {openedScheduleDetailId ? (
        <div className="schedule-detail-mask" onClick={() => setOpenedScheduleDetailId(null)}>
          <section className="schedule-detail-modal" onClick={(event) => event.stopPropagation()}>
            {(() => {
              const current = scheduledItems.find((item) => item.id === openedScheduleDetailId);
              if (!current) return <p className="soft-text">任务不存在</p>;
              const linked = todosById.get(current.todoId);
              return (
                <>
                  <h3>{current.title}</h3>
                  <p className="soft-text">{current.project}</p>
                  <p className="soft-text">{formatTime(current.startHour, current.startMinute)} - {formatTime(current.endHour, current.endMinute)}</p>
                  <p className="todo-detail">{linked?.details?.trim() ? linked.details : current.details?.trim() ? current.details : "暂无详情"}</p>
                </>
              );
            })()}
          </section>
        </div>
      ) : null}

      {pendingDeleteScheduleId ? (
        <div
          id="info-popup"
          tabIndex={-1}
          className="tm-delete-popup-overlay"
          onClick={() => setPendingDeleteScheduleId(null)}
        >
          <div className="tm-delete-popup-wrap" onClick={(event) => event.stopPropagation()}>
            <div className="tm-delete-popup-card">
              <div className="tm-delete-popup-copy">
                <h3>删除日程确认</h3>
                <p>
                  你即将从时间轴删除
                  <strong>{pendingDeleteSchedule ? `《${pendingDeleteSchedule.title}》` : "该任务"}</strong>
                  。
                </p>
                <p className="tm-delete-popup-meta">
                  {pendingDeleteSchedule
                    ? `${formatTime(pendingDeleteSchedule.startHour, pendingDeleteSchedule.startMinute)} - ${formatTime(pendingDeleteSchedule.endHour, pendingDeleteSchedule.endMinute)} · 删除后可在5秒内撤销`
                    : "删除后可在5秒内撤销"}
                </p>
              </div>
              <div className="tm-delete-popup-actions">
                <button id="close-modal" type="button" className="tiny-btn" onClick={() => setPendingDeleteScheduleId(null)}>取消</button>
                <button id="confirm-button" type="button" className="tiny-btn danger" onClick={confirmRemoveSchedule}>确认删除</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showUndoBar && removedScheduleSnapshot ? (
        <div className="tm-undo-bar" role="status" aria-live="polite">
          <span>已删除《{removedScheduleSnapshot.title}》</span>
          <button type="button" className="tiny-btn" onClick={undoRemoveSchedule}>撤销</button>
        </div>
      ) : null}

    </section>
  );
}














