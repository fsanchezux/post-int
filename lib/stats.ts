import type { Project, Task } from "./types";

const DAY = 24 * 60 * 60 * 1000;

function inLastMonth(iso: string | undefined): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() <= 30 * DAY;
}

export type LastMonthTaskStats = {
  total: number;
  hard: number;
  medium: number;
  easy: number;
};

export function tasksCompletedLastMonth(
  active: Project[],
  history: Project[]
): number {
  return tasksCompletedLastMonthDetailed(active, history).total;
}

export function tasksCompletedLastMonthDetailed(
  active: Project[],
  history: Project[]
): LastMonthTaskStats {
  const acc: LastMonthTaskStats = { total: 0, hard: 0, medium: 0, easy: 0 };
  for (const p of [...active, ...history]) {
    for (const t of p.tasks) {
      if (!t.done || !inLastMonth(t.doneAt)) continue;
      acc.total++;
      if (t.autoTag === "hard") acc.hard++;
      else if (t.autoTag === "easy") acc.easy++;
      else acc.medium++;
    }
  }
  return acc;
}

export function moneyEarnedLastMonth(history: Project[]): number {
  let total = 0;
  for (const p of history) {
    if (!p.paid || !p.amount) continue;
    if (!inLastMonth(p.completedAt)) continue;
    total += p.amount;
  }
  return total;
}

// ---------- Streaks ----------

function dayKey(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function prevDayKey(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function prevWeekKey(key: string): string {
  const [year, w] = key.split("-W").map(Number);
  if (w > 1) return `${year}-W${String(w - 1).padStart(2, "0")}`;
  return `${year - 1}-W52`;
}

function collectCompletedTasks(active: Project[], history: Project[]): Task[] {
  const out: Task[] = [];
  for (const p of [...active, ...history]) {
    for (const t of p.tasks) {
      if (t.done && t.doneAt) out.push(t);
    }
  }
  return out;
}

export function weeklyStreak(active: Project[], history: Project[]): number {
  const weeks = new Set<string>();
  for (const t of collectCompletedTasks(active, history)) {
    weeks.add(isoWeekKey(new Date(t.doneAt!)));
  }
  if (weeks.size === 0) return 0;
  let cursor = isoWeekKey(new Date());
  if (!weeks.has(cursor)) cursor = prevWeekKey(cursor);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor = prevWeekKey(cursor);
  }
  return streak;
}

export function dailyStreak(active: Project[], history: Project[]): number {
  const days = new Set<string>();
  for (const t of collectCompletedTasks(active, history)) {
    days.add(dayKey(new Date(t.doneAt!)));
  }
  if (days.size === 0) return 0;
  let cursor = dayKey(new Date());
  if (!days.has(cursor)) cursor = prevDayKey(cursor);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = prevDayKey(cursor);
  }
  return streak;
}
