"use client";

const KEY = "pmw:usage-days";

function dayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function recordTodayOpened() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    const days: string[] = raw ? JSON.parse(raw) : [];
    const today = dayKey();
    if (days[days.length - 1] === today) return;
    if (!days.includes(today)) days.push(today);
    days.sort();
    // Keep last 365 days max
    const trimmed = days.slice(-365);
    window.localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {}
}

export function loadUsageDays(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

/**
 * Returns the last `n` calendar days as { date, opened } in chronological order.
 */
export function usageHistory(n = 30): Array<{ date: string; opened: boolean }> {
  const set = new Set(loadUsageDays());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const out: Array<{ date: string; opened: boolean }> = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    out.push({ date: key, opened: set.has(key) });
  }
  return out;
}
