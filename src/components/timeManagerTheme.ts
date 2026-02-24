export function getGreetingLabel(hour: number): string {
  if (hour < 12) return "早上好！准备好开启高效的一天了吗？";
  if (hour < 18) return "中午好！继续保持专注节奏。";
  return "晚上好！收尾并复盘今天进展。";
}

export function formatClockPill(date: Date): string {
  const hour24 = date.getHours();
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  const isAm = hour24 < 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${isAm ? "上午" : "下午"}`;
}

export function getClockParts(clockLabel: string): { time: string; period: string } {
  const [time, period] = clockLabel.trim().split(/\s+/, 2);
  return { time: time || "--:--", period: period || "" };
}
