"use client";

const KEY = "pmw:outside-hours-events";
const RECENT_WINDOW_MS = 12 * 60 * 60 * 1000; // 12h

export type OutsideHoursEvent = {
  at: string; // ISO timestamp
  projectId: string;
  taskId: string;
};

function load(): OutsideHoursEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OutsideHoursEvent[]) : [];
  } catch {
    return [];
  }
}

function save(events: OutsideHoursEvent[]) {
  if (typeof window === "undefined") return;
  // Keep only last 50.
  window.localStorage.setItem(KEY, JSON.stringify(events.slice(-50)));
}

export function recordOutsideHours(projectId: string, taskId: string) {
  const events = load();
  events.push({ at: new Date().toISOString(), projectId, taskId });
  save(events);
}

export function recentOutsideHours(): OutsideHoursEvent[] {
  const cutoff = Date.now() - RECENT_WINDOW_MS;
  return load().filter((e) => new Date(e.at).getTime() >= cutoff);
}

export function dismissOutsideHours() {
  save([]);
}
