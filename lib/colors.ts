import type { CSSProperties } from "react";
import type { DifficultyTag, Project } from "./types";

export const POSTIT_PALETTE = [
  "#b1d8b9", // sage green
  "#9bccd0", // soft cyan
  "#1f4381", // navy
  "#e22028", // red
  "#f6c343", // amber
] as const;

export const POSTIT_YELLOW = "#ffea73";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const v = h.length === 3
    ? h.split("").map((c) => c + c).join("")
    : h.slice(0, 6);
  const num = parseInt(v, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function darken(hex: string, amount = 0.35): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

export function lighten(hex: string, amount = 0.35): string {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

export function isDarkColor(hex: string): boolean {
  return luminance(hex) < 0.35;
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const srgb = [r, g, b].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

export function textColorFor(bg: string): string {
  return isDarkColor(bg) ? "#ffffff" : "#1c1c1c";
}

export function taskTextStyle(
  tag: DifficultyTag | undefined,
  done: boolean,
  onDark = false
): { className: string; style: CSSProperties } {
  const base = onDark ? "#ffffff" : "#1c1c1c";
  if (done) {
    return {
      className: "line-through",
      style: { opacity: 0.45, fontWeight: 500, color: base },
    };
  }
  switch (tag) {
    case "hard":
      return { className: "", style: { fontWeight: 800, color: base } };
    case "easy":
      return { className: "", style: { fontWeight: 500, opacity: 0.6, color: base } };
    case "medium":
    default:
      return { className: "", style: { fontWeight: 700, color: base } };
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
  return { bg, text: textColorFor(bg), border: "rgba(0,0,0,0.18)" };
}

export function progress(project: Project) {
  if (project.tasks.length === 0) return 0;
  return Math.round(
    (project.tasks.filter((t) => t.done).length / project.tasks.length) * 100
  );
}
