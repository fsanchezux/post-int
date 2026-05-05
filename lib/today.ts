import type { Project, Settings, WorkSlot } from "./types";

export type TimeRange = { start: Date; end: Date };

export type TodayPlan = {
  hasWork: boolean;
  workStart?: Date;
  workEnd?: Date;
  workMinutes: number;
  freeMinutes: number;
  conflicts: Array<{
    id: string;
    summary: string;
    start: Date;
    end: Date;
    minutes: number;
    allDay: boolean;
  }>;
  outsideEvents: Array<{
    id: string;
    summary: string;
    start: Date;
    end: Date;
    allDay: boolean;
  }>;
};

export type RawEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
};

function setTimeOnDate(base: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export function buildTodayPlan(
  settings: Settings,
  googleEvents: RawEvent[],
  now: Date = new Date()
): TodayPlan {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();

  const slots = settings.workSchedule.filter((s) => s.day === dayOfWeek);

  if (slots.length === 0) {
    return {
      hasWork: false,
      workMinutes: 0,
      freeMinutes: 0,
      conflicts: [],
      outsideEvents: googleEvents.map((ev) => ({
        id: ev.id,
        summary: ev.summary,
        start: new Date(ev.start),
        end: new Date(ev.end),
        allDay: ev.allDay,
      })),
    };
  }

  const slot = slots[0];
  const workStart = setTimeOnDate(today, slot.start);
  const workEnd = setTimeOnDate(today, slot.end);
  const workMinutes = (workEnd.getTime() - workStart.getTime()) / 60000;

  const conflicts: TodayPlan["conflicts"] = [];
  const outsideEvents: TodayPlan["outsideEvents"] = [];

  for (const ev of googleEvents) {
    const start = new Date(ev.start);
    const end = new Date(ev.end);

    if (ev.allDay) {
      conflicts.push({
        id: ev.id,
        summary: ev.summary,
        start,
        end,
        minutes: workMinutes,
        allDay: true,
      });
      continue;
    }

    const overlapStart = start > workStart ? start : workStart;
    const overlapEnd = end < workEnd ? end : workEnd;
    const overlap = (overlapEnd.getTime() - overlapStart.getTime()) / 60000;

    if (overlap > 0) {
      conflicts.push({
        id: ev.id,
        summary: ev.summary,
        start,
        end,
        minutes: overlap,
        allDay: false,
      });
    } else {
      outsideEvents.push({
        id: ev.id,
        summary: ev.summary,
        start,
        end,
        allDay: false,
      });
    }
  }

  const occupiedMinutes = conflicts.reduce(
    (sum, c) => sum + (c.allDay ? workMinutes : c.minutes),
    0
  );
  const freeMinutes = Math.max(0, workMinutes - occupiedMinutes);

  return {
    hasWork: true,
    workStart,
    workEnd,
    workMinutes,
    freeMinutes,
    conflicts,
    outsideEvents,
  };
}

export function formatHM(date: Date) {
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(minutes: number) {
  if (minutes <= 0) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ---------- Work session lookup ----------

export type WorkSessionInfo =
  | { state: "active"; start: Date; end: Date; remainingMinutes: number }
  | { state: "upcoming"; start: Date; end: Date; minutesUntilStart: number }
  | { state: "none" };

function nextDateForSlot(slot: WorkSlot, from: Date): { start: Date; end: Date } {
  // Find the next occurrence of this slot's day at slot.start, on or after `from`.
  const candidate = new Date(from);
  candidate.setSeconds(0, 0);
  const targetDay = slot.day;
  const fromDay = candidate.getDay();
  let delta = (targetDay - fromDay + 7) % 7;
  // If today, start time may already be passed — caller should re-check.
  candidate.setDate(candidate.getDate() + delta);
  const start = setTimeOnDate(candidate, slot.start);
  const end = setTimeOnDate(candidate, slot.end);
  if (start.getTime() < from.getTime() && delta === 0) {
    // Slot today already past — push to next week
    start.setDate(start.getDate() + 7);
    end.setDate(end.getDate() + 7);
  }
  return { start, end };
}

export function getWorkSessionInfo(
  settings: Settings,
  now: Date = new Date()
): WorkSessionInfo {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  // Active session?
  for (const slot of settings.workSchedule.filter((s) => s.day === now.getDay())) {
    const start = setTimeOnDate(today, slot.start);
    const end = setTimeOnDate(today, slot.end);
    if (now >= start && now < end) {
      return {
        state: "active",
        start,
        end,
        remainingMinutes: Math.round((end.getTime() - now.getTime()) / 60000),
      };
    }
  }

  // Otherwise, next upcoming.
  let best: { start: Date; end: Date } | null = null;
  for (const slot of settings.workSchedule) {
    const next = nextDateForSlot(slot, now);
    if (!best || next.start.getTime() < best.start.getTime()) best = next;
  }
  if (!best) return { state: "none" };

  return {
    state: "upcoming",
    start: best.start,
    end: best.end,
    minutesUntilStart: Math.round((best.start.getTime() - now.getTime()) / 60000),
  };
}

export function isWithinWorkHours(settings: Settings, when: Date = new Date()): boolean {
  const info = getWorkSessionInfo(settings, when);
  return info.state === "active";
}

// ---------- Task deadline conflicts within a session ----------

export type TaskConflict = {
  projectId: string;
  projectName: string;
  endDate: string;
};

/**
 * Returns active projects whose endDate falls within the active or next
 * upcoming work session (i.e. you'd need to ship them during this session).
 */
export function tasksOverlappingSession(
  projects: Project[],
  session: WorkSessionInfo
): TaskConflict[] {
  if (session.state === "none") return [];
  const start = session.state === "active" ? new Date() : session.start;
  const end = session.end;
  const out: TaskConflict[] = [];
  for (const p of projects) {
    if (!p.endDate) continue;
    const d = new Date(`${p.endDate}T23:59:59`);
    if (d.getTime() >= start.getTime() && d.getTime() <= end.getTime()) {
      out.push({ projectId: p.id, projectName: p.name, endDate: p.endDate });
    }
  }
  return out;
}

export function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "0 min";
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = Math.round(minutes % 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (days === 0 && hours < 6) parts.push(`${mins}min`);
  return parts.join(" ") || `${mins}min`;
}
