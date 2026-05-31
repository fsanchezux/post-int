import type { CSSProperties } from "react";
import type { DifficultyTag, Project } from "./types";

export const POSTIT_PALETTE = [
  "#5dbf76", // green
  "#3babff", // blue
  "#ffbcdf", // pink
] as const;

export const POSTIT_YELLOW = "#ffea73";

export function taskTextStyle(
  tag: DifficultyTag | undefined,
  done: boolean
): { className: string; style: CSSProperties } {
  if (done) {
    return {
      className: "line-through",
      style: { opacity: 0.45, fontWeight: 500 },
    };
  }
  switch (tag) {
    case "hard":
      return { className: "", style: { fontWeight: 800, color: "#0a0a0a" } };
    case "easy":
      return { className: "", style: { fontWeight: 500, opacity: 0.55 } };
    case "medium":
    default:
      return { className: "", style: { fontWeight: 700, color: "#1c1c1c" } };
  }
}

export type PostItColor = (typeof POSTIT_PALETTE)[number];

export function pickRandomColor(): PostItColor {
  return POSTIT_PALETTE[Math.floor(Math.random() * POSTIT_PALETTE.length)];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function postItStyle(project: Project): { bg: string; text: string; border: string } {
  const bg = project.color ?? POSTIT_PALETTE[hashString(project.id) % POSTIT_PALETTE.length];
  return { bg, text: "#1c1c1c", border: "rgba(0,0,0,0.18)" };
}

export function progress(project: Project) {
  if (project.tasks.length === 0) return 0;
  return Math.round(
    (project.tasks.filter((t) => t.done).length / project.tasks.length) * 100
  );
}
