import type { CalendarEvent, FreeSlot, Project, Recommendation, Settings } from "./types";
import { progress } from "./colors";

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function dateForDay(weekStart: Date, day: number) {
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + ((day - weekStart.getDay() + 7) % 7));
  return d;
}

function eventsForDate(events: CalendarEvent[], date: Date) {
  return events.filter((e) => {
    const start = new Date(e.start);
    return (
      start.getFullYear() === date.getFullYear() &&
      start.getMonth() === date.getMonth() &&
      start.getDate() === date.getDate()
    );
  });
}

export function getFreeSlots(settings: Settings, weekStart?: Date): FreeSlot[] {
  const start = weekStart ?? new Date();
  const slots: FreeSlot[] = [];

  for (const work of settings.workSchedule) {
    const date = dateForDay(start, work.day);
    const dayEvents = eventsForDate(settings.events, date)
      .map((e) => ({
        s: toMinutes(new Date(e.start).toTimeString().slice(0, 5)),
        e: toMinutes(new Date(e.end).toTimeString().slice(0, 5)),
      }))
      .sort((a, b) => a.s - b.s);

    let cursor = toMinutes(work.start);
    const end = toMinutes(work.end);

    for (const ev of dayEvents) {
      if (ev.s > cursor) {
        slots.push({
          day: work.day,
          date: date.toISOString().slice(0, 10),
          start: fromMinutes(cursor),
          end: fromMinutes(Math.min(ev.s, end)),
          durationMinutes: Math.min(ev.s, end) - cursor,
        });
      }
      cursor = Math.max(cursor, ev.e);
      if (cursor >= end) break;
    }

    if (cursor < end) {
      slots.push({
        day: work.day,
        date: date.toISOString().slice(0, 10),
        start: fromMinutes(cursor),
        end: fromMinutes(end),
        durationMinutes: end - cursor,
      });
    }
  }

  return slots.filter((s) => s.durationMinutes >= 30);
}

function scoreProject(project: Project): { score: number; reason: string } {
  const reasons: string[] = [];
  let score = 0;

  score += project.importance * 20;
  reasons.push(`importancia ${project.importance}/5`);

  if (project.paid && project.amount) {
    const moneyScore = Math.min(40, project.amount / 25);
    score += moneyScore;
    reasons.push(`remunerado ${project.amount}€`);
  }

  if (project.endDate) {
    const daysLeft = Math.max(
      0,
      (new Date(project.endDate).getTime() - Date.now()) / 86400000
    );
    if (daysLeft <= 14) {
      const urgency = (14 - daysLeft) * 5;
      score += urgency;
      reasons.push(`deadline en ${Math.ceil(daysLeft)}d`);
    }
  }

  const pct = progress(project);
  if (pct > 0 && pct < 100) {
    score += (100 - pct) * 0.2;
    reasons.push(`${pct}% completado`);
  }

  return { score, reason: reasons.join(" · ") };
}

export function recommend(projects: Project[], settings: Settings): Recommendation[] {
  const slots = getFreeSlots(settings);
  if (slots.length === 0 || projects.length === 0) return [];

  const ranked = projects
    .map((p) => ({ project: p, ...scoreProject(p) }))
    .sort((a, b) => b.score - a.score);

  return slots.map((slot, i) => {
    const pick = ranked[i % ranked.length];
    return {
      slot,
      projectId: pick.project.id,
      projectName: pick.project.name,
      reason: pick.reason,
    };
  });
}
