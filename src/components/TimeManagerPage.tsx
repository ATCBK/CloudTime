import { ClipboardEvent as ReactClipboardEvent, DragEvent, MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bold, Check, ChevronLeft, ChevronRight, Eye, EyeOff, Italic, Link2, List, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { TimelineItem, TodoItem } from "../types";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { hasLightNoteContent, isLikelyMarkdown, markdownToSanitizedHtml, resolveInitialLightNoteHtml, sanitizeLightNoteHtml } from "./markdownCore";
import { buildTaskReferenceDropHtml, scheduleToTodoCandidate, toggleTodoCompleted } from "./timeManagerActions";
import { boundRange, computeAutoScrollDelta, pointerToSnappedRange, resizeBottomEdge, resizeTopEdge, snapToStep } from "./timeDragMath";
import { buildQuickPanelItems, removeTodoAfterSchedule } from "./quickPanelState";
import { buildHourSlots24, computeMinuteOfDay, computeMsUntilNextMidnight, computeMsUntilTodayRecycle, computeNowLineTop, isSameDateKey, isValidDateKey, toggleWeekExpandedDate } from "./timeManagerClock";
import { computeLaneWidth, computeTimelineUsableWidth } from "./timelineLayout";
import { getTimelineCardDensity } from "./timelineCardLayout";
import { getGreetingLabel } from "./timeManagerTheme";
import { canCreateTodo, removeScheduleWithSnapshot, undoRemovedSchedule } from "./timeManagerSafety";
import { buildTodoTypesFromTodos, canCreateTodoType, DEFAULT_TODO_TYPE, normalizeTodoType } from "./todoTypeModel";

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

type ResizeEdge = "top" | "bottom";

const HOURS = buildHourSlots24();
const START_HOUR = 0;
const PIXELS_PER_HOUR = 56;
const TOTAL_MINUTES = HOURS.length * 60;
const MIN_ITEM_MINUTES = 15;
const MIN_RESIZE_MINUTES = 30;
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
const LIGHT_NOTE_PLACEHOLDER = "开始记录今天的重要事项...";


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
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
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

function areStringListsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function computeDurationMinutesFromSchedule(item: ScheduledItem): number {
  return Math.max(MIN_ITEM_MINUTES, toMinutes(item.endHour, item.endMinute) - toMinutes(item.startHour, item.startMinute));
}

function placeCaretAtEnd(target: HTMLElement): void {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function TimeManagerPage({ todos, timelineItems }: TimeManagerPageProps): JSX.Element {
  const initialNow = useMemo(() => new Date(), []);
  const [currentDateKey, setCurrentDateKey] = useState<string>(formatDateKey(initialNow));
  const [nowMinute, setNowMinute] = useState<number>(computeMinuteOfDay(initialNow));
  const initialTodoById = useMemo(() => new Map(todos.map((todo) => [todo.id, todo])), [todos]);
  const [calendarView, setCalendarView] = useLocalStorageState<CalendarView>("cloudo.time.calendarView", "day");
  const [selectedDateKey, setSelectedDateKey] = useLocalStorageState<string>("cloudo.time.selectedDateKey", formatDateKey(initialNow));

  const [todosState, setTodosState] = useLocalStorageState<TodoItem[]>("cloudo.time.todos", todos);
  const [baseTodoType, setBaseTodoType] = useLocalStorageState<string>("cloudo.time.baseTodoType", DEFAULT_TODO_TYPE);
  const [newTodoTitle, setNewTodoTitle] = useState<string>("");
  const [newTodoDetail, setNewTodoDetail] = useState<string>("");
  const [newTodoType, setNewTodoType] = useLocalStorageState<string>("cloudo.time.newTodoType", baseTodoType);
  const [newTodoDuration, setNewTodoDuration] = useLocalStorageState<number>("cloudo.time.newTodoDuration", 60);
  const [todoTypesState, setTodoTypesState] = useLocalStorageState<string[]>("cloudo.time.todoTypes", [baseTodoType]);
  const [selectedTodoType, setSelectedTodoType] = useLocalStorageState<string>("cloudo.time.selectedTodoType", baseTodoType);
  const [showCreateTodoModal, setShowCreateTodoModal] = useState<boolean>(false);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [showTypeManageMenu, setShowTypeManageMenu] = useState<boolean>(false);
  const [typeManageMode, setTypeManageMode] = useState<"create" | "rename" | "delete" | null>(null);
  const [typeManageName, setTypeManageName] = useState<string>("");
  const [typeManageError, setTypeManageError] = useState<string | null>(null);

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
  const [resizingItemId, setResizingItemId] = useState<string | null>(null);
  const [pendingCompleteScheduleId, setPendingCompleteScheduleId] = useState<string | null>(null);

  const paneRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ divider: 0 | 1; startX: number; start: PaneWidths } | null>(null);
  const moveTaskRef = useRef<{ itemId: string; offsetMinutes: number; durationMinutes: number } | null>(null);
  const resizeTaskRef = useRef<{ itemId: string; edge: ResizeEdge; fixedMinute: number } | null>(null);
  const lightNoteEditorRef = useRef<HTMLDivElement>(null);
  const quickCreateTitleRef = useRef<HTMLInputElement>(null);
  const undoTimerRef = useRef<number | null>(null);
  const completeConfirmTimerRef = useRef<number | null>(null);

  const selectedDate = useMemo(() => parseDateKey(selectedDateKey), [selectedDateKey]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const monthDates = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const todoTypes = useMemo(() => buildTodoTypesFromTodos(todosState, todoTypesState, baseTodoType), [baseTodoType, todoTypesState, todosState]);
  const selectedTypeTodos = useMemo(
    () => todosState.filter((todo) => normalizeTodoType(todo.project, baseTodoType) === selectedTodoType),
    [baseTodoType, selectedTodoType, todosState]
  );

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
  const isEditingTodo = Boolean(editingTodoId);

  useEffect(() => {
    if (!areStringListsEqual(todoTypesState, todoTypes)) setTodoTypesState(todoTypes);
  }, [setTodoTypesState, todoTypes, todoTypesState]);

  useEffect(() => {
    if (!todoTypes.includes(selectedTodoType)) {
      setSelectedTodoType(baseTodoType);
    }
  }, [baseTodoType, selectedTodoType, setSelectedTodoType, todoTypes]);

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

    if (text && isLikelyMarkdown(text)) {
      document.execCommand("insertHTML", false, sanitizeLightNoteHtml(markdownToSanitizedHtml(text)));
    } else if (html) document.execCommand("insertHTML", false, sanitizeLightNoteHtml(html));
    else if (text) document.execCommand("insertHTML", false, sanitizeLightNoteHtml(markdownToSanitizedHtml(text)));

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
    // 仅在首次挂载时设置今天的日期
    const today = formatDateKey(new Date());
    setCurrentDateKey(today);
    // 只在 selectedDateKey 为空或无效时才设置为今天
    if (!selectedDateKey || !isValidDateKey(selectedDateKey)) {
      setSelectedDateKey(today);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 仅在挂载时执行一次

  useEffect(() => {
    const focusCreate = (): void => {
      setEditingTodoId(null);
      setShowCreateTodoModal(true);
      const preferredType = todoTypes.includes(selectedTodoType) ? selectedTodoType : baseTodoType;
      setNewTodoType(preferredType);
      requestAnimationFrame(() => {
        quickCreateTitleRef.current?.focus();
      });
    };

    const onCustomFocus = (): void => focusCreate();
    window.addEventListener("cloudo:focusQuickCreate", onCustomFocus);

    return () => {
      window.removeEventListener("cloudo:focusQuickCreate", onCustomFocus);
    };
  }, [baseTodoType, selectedTodoType, setNewTodoType, todoTypes]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current);
      if (completeConfirmTimerRef.current !== null) window.clearTimeout(completeConfirmTimerRef.current);
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

  useEffect(() => {
    if (!showCreateTodoModal) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setShowCreateTodoModal(false);
        setEditingTodoId(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showCreateTodoModal]);

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
    const onMouseMove = (event: MouseEvent): void => {
      if (!resizeTaskRef.current || !timelineRef.current) return;

      const timelineRect = timelineRef.current.getBoundingClientRect();
      const pointerY = event.clientY - timelineRect.top;
      const autoScroll = computeAutoScrollDelta(pointerY, timelineRect.height, AUTO_SCROLL_EDGE, AUTO_SCROLL_SPEED);
      if (autoScroll !== 0) {
        const maxScrollTop = Math.max(0, timelineRef.current.scrollHeight - timelineRef.current.clientHeight);
        timelineRef.current.scrollTop = Math.max(0, Math.min(maxScrollTop, timelineRef.current.scrollTop + autoScroll));
      }

      const relativeY = event.clientY - timelineRect.top + timelineRef.current.scrollTop;
      const pointerMinute = snapToStep(
        Math.round((Math.max(0, Math.min(relativeY, HOURS.length * PIXELS_PER_HOUR)) / PIXELS_PER_HOUR) * 60),
        SNAP_MINUTES
      );

      const { itemId, edge, fixedMinute } = resizeTaskRef.current;
      setScheduledItems((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const startMinute = toMinutes(item.startHour, item.startMinute);
          const endMinute = toMinutes(item.endHour, item.endMinute);
          if (edge === "top") {
            const nextStart = resizeTopEdge(pointerMinute, fixedMinute, MIN_RESIZE_MINUTES);
            const startClock = toClock(nextStart);
            const endClock = toClock(endMinute);
            return { ...item, startHour: startClock.hour, startMinute: startClock.minute, endHour: endClock.hour, endMinute: endClock.minute };
          }
          const nextEnd = resizeBottomEdge(pointerMinute, fixedMinute, MIN_RESIZE_MINUTES, TOTAL_MINUTES);
          const startClock = toClock(startMinute);
          const endClock = toClock(nextEnd);
          return { ...item, startHour: startClock.hour, startMinute: startClock.minute, endHour: endClock.hour, endMinute: endClock.minute };
        })
      );
    };

    const onMouseUp = (): void => {
      if (!resizeTaskRef.current) return;
      resizeTaskRef.current = null;
      setResizingItemId(null);
      document.body.classList.remove("moving-task-active");
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [setScheduledItems]);

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

  const closeTodoModal = (): void => {
    setShowCreateTodoModal(false);
    setEditingTodoId(null);
  };

  const submitTodo = (): void => {
    const title = newTodoTitle.trim();
    if (!canCreateTodo(title)) return;
    const details = newTodoDetail.trim();
    const todoType = normalizeTodoType(newTodoType, baseTodoType);
    if (editingTodoId) {
      const durationMinutes = Math.max(15, newTodoDuration);
      setTodosState((prev) =>
        prev.map((todo) =>
          todo.id === editingTodoId
            ? { ...todo, title, project: todoType, durationMinutes, details }
            : todo
        )
      );
      setScheduledItems((prev) =>
        prev.map((item) =>
          item.todoId === editingTodoId
            ? { ...item, title, project: todoType, details }
            : item
        )
      );
      setNewTodoTitle("");
      setNewTodoDetail("");
      closeTodoModal();
      return;
    }
    setTodosState((prev) => [
      {
        id: generateId(),
        title,
        project: todoType,
        durationMinutes: Math.max(15, newTodoDuration),
        details,
        completed: false
      },
      ...prev
    ]);
    setNewTodoTitle("");
    setNewTodoDetail("");
    closeTodoModal();
  };

  const openCreateTodoModal = (): void => {
    setEditingTodoId(null);
    setNewTodoTitle("");
    setNewTodoDetail("");
    const preferredType = todoTypes.includes(selectedTodoType) ? selectedTodoType : baseTodoType;
    setNewTodoType(preferredType);
    setShowCreateTodoModal(true);
    requestAnimationFrame(() => quickCreateTitleRef.current?.focus());
  };

  const openEditTodoModal = (todoId: string): void => {
    const target = todosById.get(todoId);
    if (!target) return;
    setEditingTodoId(todoId);
    setNewTodoTitle(target.title);
    setNewTodoDetail(target.details ?? "");
    setNewTodoType(normalizeTodoType(target.project, baseTodoType));
    setNewTodoDuration(Math.max(15, target.durationMinutes));
    setShowCreateTodoModal(true);
    requestAnimationFrame(() => quickCreateTitleRef.current?.focus());
  };

  const openEditTodoModalFromSchedule = (scheduleId: string): void => {
    const current = scheduledItems.find((item) => item.id === scheduleId);
    if (!current) return;
    const linked = todosById.get(current.todoId);
    setEditingTodoId(current.todoId);
    setNewTodoTitle(linked?.title ?? current.title);
    setNewTodoDetail(linked?.details ?? current.details ?? "");
    setNewTodoType(normalizeTodoType(linked?.project ?? current.project, baseTodoType));
    setNewTodoDuration(linked?.durationMinutes ?? computeDurationMinutesFromSchedule(current));
    setShowCreateTodoModal(true);
    requestAnimationFrame(() => quickCreateTitleRef.current?.focus());
  };

  const shiftTodoType = (delta: -1 | 1): void => {
    if (todoTypes.length === 0) return;
    const index = Math.max(0, todoTypes.findIndex((type) => type === selectedTodoType));
    const nextIndex = Math.max(0, Math.min(todoTypes.length - 1, index + delta));
    const nextType = todoTypes[nextIndex] ?? baseTodoType;
    setSelectedTodoType(nextType);
  };

  const openTypeManage = (): void => {
    setShowTypeManageMenu((prev) => !prev);
    setTypeManageMode(null);
    setTypeManageName("");
    setTypeManageError(null);
  };

  const startTypeManageMode = (mode: "create" | "rename" | "delete"): void => {
    setTypeManageMode(mode);
    setTypeManageError(null);
    if (mode === "rename") setTypeManageName(selectedTodoType);
    if (mode === "create") setTypeManageName("");
  };

  const applyCreateType = (): void => {
    const result = canCreateTodoType(typeManageName, todoTypes);
    if (!result.ok) {
      if (result.reason === "empty") setTypeManageError("类型名不能为空");
      if (result.reason === "duplicate") setTypeManageError("该类型已存在");
      if (result.reason === "too_long") setTypeManageError("类型名最多20个字符");
      return;
    }
    setTodoTypesState((prev) => [...prev, result.value]);
    setSelectedTodoType(result.value);
    setNewTodoType(result.value);
    setTypeManageName("");
    setTypeManageError(null);
    setTypeManageMode(null);
    setShowTypeManageMenu(false);
  };

  const applyRenameType = (): void => {
    const from = selectedTodoType;
    const to = typeManageName.trim();
    if (!to) {
      setTypeManageError("类型名不能为空");
      return;
    }
    if (to === from) {
      setTypeManageMode(null);
      setShowTypeManageMenu(false);
      return;
    }
    const normalizedSet = todoTypes.filter((item) => item !== from);
    const result = canCreateTodoType(to, normalizedSet);
    if (!result.ok) {
      if (result.reason === "duplicate") setTypeManageError("该类型已存在");
      if (result.reason === "too_long") setTypeManageError("类型名最多20个字符");
      if (result.reason === "empty") setTypeManageError("类型名不能为空");
      return;
    }
    setTodoTypesState((prev) => prev.map((item) => (item === from ? result.value : item)));
    setTodosState((prev) => prev.map((todo) => (normalizeTodoType(todo.project, baseTodoType) === from ? { ...todo, project: result.value } : todo)));
    setScheduledItems((prev) => prev.map((item) => (normalizeTodoType(item.project, baseTodoType) === from ? { ...item, project: result.value } : item)));
    if (from === baseTodoType) setBaseTodoType(result.value);
    setSelectedTodoType(result.value);
    setNewTodoType((prev) => (prev === from ? result.value : prev));
    setTypeManageMode(null);
    setShowTypeManageMenu(false);
    setTypeManageError(null);
  };

  const applyDeleteType = (): void => {
    const target = selectedTodoType;
    if (target === baseTodoType) {
      setTypeManageError("基础类型不可删除");
      return;
    }
    setTodoTypesState((prev) => prev.filter((item) => item !== target));
    setTodosState((prev) => prev.map((todo) => (normalizeTodoType(todo.project, baseTodoType) === target ? { ...todo, project: baseTodoType } : todo)));
    setScheduledItems((prev) => prev.map((item) => (normalizeTodoType(item.project, baseTodoType) === target ? { ...item, project: baseTodoType } : item)));
    setSelectedTodoType(baseTodoType);
    setNewTodoType((prev) => (prev === target ? baseTodoType : prev));
    setTypeManageMode(null);
    setShowTypeManageMenu(false);
    setTypeManageError(null);
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

  const handleScheduleDragStart = (event: DragEvent<HTMLElement>, scheduleId: string): void => {
    const source = scheduledItems.find((item) => item.id === scheduleId);
    if (!source) return;

    const ghost = document.createElement("div");
    ghost.className = "todo-drag-ghost";
    ghost.textContent = `${source.title} (${formatTime(source.startHour, source.startMinute)}-${formatTime(source.endHour, source.endMinute)})`;
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, 12, 12);
    setTimeout(() => ghost.remove(), 0);

    event.dataTransfer.setData("application/x-cloudo-schedule-id", scheduleId);
    event.dataTransfer.effectAllowed = "move";
    setDraggingScheduleId(scheduleId);
  };

  const handleScheduleDragEnd = (): void => {
    setDraggingScheduleId(null);
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
    const html = buildTaskReferenceDropHtml({
      taskId: item.todoId,
      title: item.title,
      project: item.project,
      timeLabel
    });

    lightNoteEditorRef.current.focus({ preventScroll: true });
    lightNoteEditorRef.current.insertAdjacentHTML("beforeend", html);
    placeCaretAtEnd(lightNoteEditorRef.current);
    setLightNoteHtml(sanitizeLightNoteHtml(lightNoteEditorRef.current.innerHTML));
  };

  const removeTaskCardFromLightNote = (card: Element): void => {
    if (!lightNoteEditorRef.current) return;
    const next = card.nextElementSibling;
    card.remove();
    if (next && next.tagName === "P" && !next.textContent?.trim()) next.remove();
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

  const handleLightNoteMouseDown = (event: ReactMouseEvent<HTMLDivElement>): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const removeTrigger = target.closest(".ln-task-remove");
    if (!removeTrigger) return;
    const card = removeTrigger.closest(".ln-task-card");
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();
    removeTaskCardFromLightNote(card);
  };

  const handleTimelineMoveHandleMouseDown = (event: ReactMouseEvent<HTMLElement>, item: ScheduledItem): void => {
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

  const handleTimelineResizeMouseDown = (event: ReactMouseEvent<HTMLElement>, item: ScheduledItem, edge: ResizeEdge): void => {
    event.preventDefault();
    event.stopPropagation();
    const startMinute = toMinutes(item.startHour, item.startMinute);
    const endMinute = toMinutes(item.endHour, item.endMinute);
    resizeTaskRef.current = {
      itemId: item.id,
      edge,
      fixedMinute: edge === "top" ? endMinute : startMinute
    };
    setResizingItemId(item.id);
    document.body.classList.add("moving-task-active");
  };

  const toggleScheduleCompleted = (scheduleId: string): void => {
    const target = scheduledItems.find((item) => item.id === scheduleId);
    if (!target) return;
    const currentCompleted = target.completed ?? false;
    if (currentCompleted) {
      setScheduledItems((prev) => prev.map((item) => (item.todoId === target.todoId ? { ...item, completed: false } : item)));
      setTodosState((prev) => prev.map((todo) => (todo.id === target.todoId ? { ...todo, completed: false } : todo)));
      setPendingCompleteScheduleId(null);
      if (completeConfirmTimerRef.current !== null) {
        window.clearTimeout(completeConfirmTimerRef.current);
        completeConfirmTimerRef.current = null;
      }
      return;
    }

    if (pendingCompleteScheduleId !== scheduleId) {
      setPendingCompleteScheduleId(scheduleId);
      if (completeConfirmTimerRef.current !== null) window.clearTimeout(completeConfirmTimerRef.current);
      completeConfirmTimerRef.current = window.setTimeout(() => {
        setPendingCompleteScheduleId(null);
        completeConfirmTimerRef.current = null;
      }, 1200);
      return;
    }

    setScheduledItems((prev) => prev.map((item) => (item.todoId === target.todoId ? { ...item, completed: true } : item)));
    setTodosState((prev) => prev.map((todo) => (todo.id === target.todoId ? { ...todo, completed: true } : todo)));
    setPendingCompleteScheduleId(null);
    if (completeConfirmTimerRef.current !== null) {
      window.clearTimeout(completeConfirmTimerRef.current);
      completeConfirmTimerRef.current = null;
    }
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
  const lightNoteIsEmpty = useMemo(() => !hasLightNoteContent(lightNoteHtml), [lightNoteHtml]);

  return (
    <section className="page time-manager-page">
      <header className="topbar time-manager-topbar">
        <div className="tm-hero">
          <h2>时间管理看板</h2>
          <p>{greetingLabel}</p>
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
          <div className="tm-todo-header">
            <h3>待办池</h3>
            <span className="tm-todo-count">{selectedTodoType} · {selectedTypeTodos.length}/{todosState.length}</span>
            <button type="button" className="tm-primary-btn" onClick={openCreateTodoModal}>+ 新建任务</button>
          </div>

          <div className="tm-todo-controls">
            <div className="tm-type-rail">
              <button type="button" className="tm-rail-icon-btn" aria-label="上一类型" onClick={() => shiftTodoType(-1)}>
                <ChevronLeft size={14} />
              </button>
              <div className="tm-type-current">
                <button type="button" className="tm-type-chip active" onClick={() => setSelectedTodoType(selectedTodoType)}>
                  {selectedTodoType}
                </button>
              </div>
              <button type="button" className="tm-rail-icon-btn" aria-label="下一类型" onClick={() => shiftTodoType(1)}>
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                className="tm-add-type-btn"
                aria-label="管理类型"
                title="管理类型"
                onClick={openTypeManage}
              >
                …
              </button>
            </div>
          </div>

          {showTypeManageMenu ? (
            <div className="tm-type-manage-row">
              <button type="button" className={typeManageMode === "create" ? "tm-ghost-btn active" : "tm-ghost-btn"} onClick={() => startTypeManageMode("create")}>新增</button>
              <button type="button" className={typeManageMode === "rename" ? "tm-ghost-btn active" : "tm-ghost-btn"} onClick={() => startTypeManageMode("rename")}>重命名</button>
              <button type="button" className={typeManageMode === "delete" ? "tm-ghost-btn active" : "tm-ghost-btn"} onClick={() => startTypeManageMode("delete")}>删除</button>
              <button type="button" className="tm-ghost-btn" onClick={() => { setShowTypeManageMenu(false); setTypeManageMode(null); setTypeManageError(null); }}>关闭</button>
            </div>
          ) : null}

          {showTypeManageMenu && (typeManageMode === "create" || typeManageMode === "rename") ? (
            <div className="tm-type-create-row">
              <input
                value={typeManageName}
                onChange={(event) => {
                  setTypeManageName(event.target.value);
                  setTypeManageError(null);
                }}
                placeholder={typeManageMode === "create" ? "输入新类型名" : "输入重命名"}
              />
              <button type="button" className="tm-ghost-btn" onClick={typeManageMode === "create" ? applyCreateType : applyRenameType}>确认</button>
              <button
                type="button"
                className="tm-ghost-btn"
                onClick={() => {
                  setTypeManageMode(null);
                  setTypeManageName("");
                  setTypeManageError(null);
                }}
              >
                取消
              </button>
            </div>
          ) : null}
          {showTypeManageMenu && typeManageMode === "delete" ? (
            <div className="tm-type-delete-row">
              <p>{selectedTodoType === baseTodoType ? "基础类型不可删除" : `删除后任务会迁移到「${baseTodoType}」`}</p>
              <button type="button" className="tm-ghost-btn danger" onClick={applyDeleteType} disabled={selectedTodoType === baseTodoType}>确认删除</button>
            </div>
          ) : null}
          {typeManageError ? <p className="tm-type-create-error">{typeManageError}</p> : null}

          {selectedTypeTodos.length === 0 ? (
            <div className="tm-empty-state">
              <p>当前类型暂无待办，先创建一条任务。</p>
              <button type="button" className="tm-ghost-btn" onClick={openCreateTodoModal}>去创建</button>
            </div>
          ) : (
            <ul className="todo-list tm-todo-list">
              {selectedTypeTodos.map((todo) => (
              <li
                key={todo.id}
                className={draggingTodoId === todo.id ? "todo-card dragging" : todo.completed ? "todo-card done" : "todo-card"}
                draggable
                onDragStart={(event) => handleTodoDragStart(event, todo.id)}
                onDragEnd={handleTodoDragEnd}
              >
                <p className="todo-title">{todo.title}</p>
                <p className="todo-meta">{normalizeTodoType(todo.project, baseTodoType)}</p>
                <p className="todo-meta">{todo.durationMinutes} 分钟</p>
                <div className="todo-actions">
                  <button type="button" title={todo.completed ? "恢复" : "完成"} onClick={() => toggleTodo(todo.id)}>
                    {todo.completed ? <RotateCcw size={14} /> : <Check size={14} />}
                  </button>
                  <button type="button" title="编辑" onClick={() => openEditTodoModal(todo.id)}>
                    <Pencil size={14} />
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
            <label className="tm-date-picker-label">
              <span className="soft-text">日期</span>
              <input
                type="date"
                className="tm-date-picker-input"
                value={selectedDateKey}
                onChange={(event) => {
                  const nextDateKey = event.target.value;
                  if (isValidDateKey(nextDateKey)) setSelectedDateKey(nextDateKey);
                }}
                aria-label="选择计划日期"
              />
            </label>
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
                const durationMinutes = Math.max(MIN_ITEM_MINUTES, end - start);
                const densityClass = getTimelineCardDensity(durationMinutes);
                const motionClass = movingItemId === item.id || resizingItemId === item.id ? "moving" : "";
                const doneClass = item.completed ? "done" : "";

                return (
                  <article
                    key={item.id}
                    className={`timeline-card ${densityClass} ${motionClass} ${doneClass}`.trim()}
                    draggable
                    onDragStart={(event) => handleScheduleDragStart(event, item.id)}
                    onDragEnd={handleScheduleDragEnd}
                    style={{
                      top: `${(start / 60) * PIXELS_PER_HOUR}px`,
                      height: `${(durationMinutes / 60) * PIXELS_PER_HOUR}px`,
                      left: `${TIMELINE_PADDING + TIMELINE_LABEL_WIDTH + item.lane * (laneWidth + LANE_GAP)}px`,
                      width: `${laneWidth}px`
                    }}
                  >
                    <div
                      className="timeline-side-handle"
                      title="拖动调整位置"
                      onMouseDown={(event) => handleTimelineMoveHandleMouseDown(event, item)}
                    >
                      <span className="timeline-side-grip" aria-hidden="true" />
                    </div>
                    <button
                      type="button"
                      className="timeline-edit-btn"
                      title="编辑"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => openEditTodoModalFromSchedule(item.id)}
                    >
                      <Pencil size={13} />
                    </button>
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
                      className={pendingCompleteScheduleId === item.id ? "timeline-complete-btn pending" : item.completed ? "timeline-complete-btn done" : "timeline-complete-btn"}
                      title={item.completed ? "恢复未完成" : pendingCompleteScheduleId === item.id ? "再次点击确认完成" : "完成"}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => toggleScheduleCompleted(item.id)}
                    >
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      className="timeline-resize-handle top"
                      title="拖拽调整开始时间"
                      onMouseDown={(event) => handleTimelineResizeMouseDown(event, item, "top")}
                    />
                    <button
                      type="button"
                      className="timeline-resize-handle bottom"
                      title="拖拽调整结束时间"
                      onMouseDown={(event) => handleTimelineResizeMouseDown(event, item, "bottom")}
                    />
                    <div className="timeline-content">
                      <p className="timeline-title">{item.title}</p>
                      <p className="timeline-meta">{formatTime(item.startHour, item.startMinute)} - {formatTime(item.endHour, item.endMinute)}</p>
                    </div>
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
                        <article
                          key={it.id}
                          className="week-item"
                          draggable
                          onDragStart={(event) => handleScheduleDragStart(event, it.id)}
                          onDragEnd={handleScheduleDragEnd}
                        >
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
                              draggable
                              onDragStart={(event) => handleScheduleDragStart(event, it.id)}
                              onDragEnd={handleScheduleDragEnd}
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
            data-placeholder={LIGHT_NOTE_PLACEHOLDER}
            data-empty={lightNoteIsEmpty ? "true" : "false"}
            contentEditable
            suppressContentEditableWarning
            onInput={() => {
              if (!lightNoteEditorRef.current) return;
              setLightNoteHtml(sanitizeLightNoteHtml(lightNoteEditorRef.current.innerHTML));
            }}
            onPaste={handleLightNotePaste}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleLightNoteDrop}
            onMouseDown={handleLightNoteMouseDown}
          />
        </section>
      </div>

      {showCreateTodoModal ? (
        <div className="tm-create-popup-overlay" onClick={closeTodoModal}>
          <div className="tm-create-popup-wrap" onClick={(event) => event.stopPropagation()}>
            <div className="tm-create-popup-card">
              <div className="tm-create-popup-copy">
                <h3>{isEditingTodo ? "编辑待办" : "新建待办"}</h3>
              </div>
              <div className="todo-create-form">
                <input ref={quickCreateTitleRef} value={newTodoTitle} onChange={(e) => setNewTodoTitle(e.target.value)} placeholder="例如：完成开发日报" />
                <select value={newTodoType} onChange={(e) => setNewTodoType(e.target.value)} aria-label="类型">
                  {todoTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={newTodoDuration}
                  onChange={(e) => setNewTodoDuration(Number(e.target.value) || 60)}
                  placeholder="时长（分钟，如45）"
                />
                <textarea value={newTodoDetail} onChange={(e) => setNewTodoDetail(e.target.value)} placeholder="详情（可选）" />
              </div>
              <div className="tm-create-popup-actions">
                <button type="button" className="tiny-btn" onClick={closeTodoModal}>取消</button>
                <button className="tiny-btn" type="button" onClick={submitTodo} disabled={!canCreateTodo(newTodoTitle)}>{isEditingTodo ? "保存" : "创建待办"}</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
                  <p className="soft-text">{normalizeTodoType(current.project, baseTodoType)}</p>
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














