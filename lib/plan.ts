import type { Mood, PlanItem, Project } from "./types";
import { progress } from "./colors";

export function projectScore(project: Project): { score: number; reason: string } {
  const reasons: string[] = [];
  let score = 0;

  score += project.importance * 20;
  reasons.push(`importancia ${project.importance}/5`);

  if (project.paid && project.amount) {
    const moneyScore = Math.min(40, project.amount / 25);
    score += moneyScore;
    reasons.push(`${project.amount}€`);
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
    reasons.push(`${pct}% en marcha`);
  }

  return { score, reason: reasons.join(" · ") };
}

export function pickProjectOfTheDay(
  projects: Project[]
): { project: Project; reason: string } | null {
  const active = projects.filter((p) => !p.completedAt);
  if (active.length === 0) return null;
  const ranked = active
    .map((p) => ({ project: p, ...projectScore(p) }))
    .sort((a, b) => b.score - a.score);
  return { project: ranked[0].project, reason: ranked[0].reason };
}

export function buildDailyPlan(projects: Project[], mood: Mood): PlanItem[] {
  const active = projects.filter((p) => !p.completedAt);
  const items: PlanItem[] = [];

  for (const p of active) {
    const projScore = projectScore(p).score;
    for (const t of p.tasks) {
      if (t.done) continue;

      let moodFactor = 0;
      if (mood === "high") {
        moodFactor = t.difficulty * 25;
      } else if (mood === "low") {
        moodFactor = (4 - t.difficulty) * 25;
      } else {
        moodFactor = t.difficulty === 2 ? 30 : 15;
      }

      const score = moodFactor + projScore * 0.4;

      items.push({
        taskId: t.id,
        taskText: t.text,
        difficulty: t.difficulty,
        projectId: p.id,
        projectName: p.name,
        paid: p.paid,
        amount: p.amount,
        importance: p.importance,
        score,
      });
    }
  }

  items.sort((a, b) => b.score - a.score);

  const limit = mood === "high" ? 6 : mood === "low" ? 8 : 7;
  return items.slice(0, limit);
}

export function moodLabel(mood: Mood): string {
  return {
    high: "💪 Mucha energía",
    normal: "🙂 Normal",
    low: "🪫 Poca energía",
  }[mood];
}

export function moodHint(mood: Mood): string {
  return {
    high: "Tareas exigentes y de alto impacto primero. Aprovecha la racha.",
    normal: "Mezcla equilibrada de tareas medias con algunas exigentes.",
    low: "Tareas rápidas y fáciles para mantener el momentum sin quemarte.",
  }[mood];
}
