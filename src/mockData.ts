import { NoteDocument, TimelineItem, TodoItem } from "./types";

export const mockTodos: TodoItem[] = [
  { id: "t1", title: "晨间规划整理", project: "生活管理", durationMinutes: 60, completed: false },
  { id: "t2", title: "版本需求梳理", project: "Cloudo", durationMinutes: 90, completed: false },
  { id: "t3", title: "晚间复盘", project: "生活管理", durationMinutes: 30, completed: false }
];

export const mockTimeline: TimelineItem[] = [
  {
    id: "tl1",
    todoId: "t1",
    title: "晨间规划整理",
    project: "生活管理",
    startHour: 9,
    startMinute: 20,
    endHour: 10,
    endMinute: 20
  },
  {
    id: "tl2",
    todoId: "t2",
    title: "版本需求梳理",
    project: "Cloudo",
    startHour: 9,
    startMinute: 40,
    endHour: 11,
    endMinute: 10
  }
];

export const mockNotes: NoteDocument[] = [
  {
    id: "n1",
    project: "Cloudo",
    title: "首页结构草案",
    date: "2026-02-13",
    content: "# 首页结构草案\n\n- 三栏布局\n- 中栏优先显示时间轴"
  }
];
