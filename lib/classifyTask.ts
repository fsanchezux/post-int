"use client";

import type { DifficultyTag } from "./types";

const CACHE_KEY = "pmw:task-tag-cache";

type TagEntry = {
  tag: DifficultyTag;
  hits: number;
  updatedAt: string;
};

type TagCache = Record<string, TagEntry>;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadCache(): TagCache {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "{}") as TagCache;
  } catch {
    return {};
  }
}

function saveCache(cache: TagCache) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function lookupCache(text: string): DifficultyTag | null {
  const cache = loadCache();
  const norm = normalize(text);
  if (!norm) return null;

  if (cache[norm]) return cache[norm].tag;

  // Fuzzy: find any cached phrase that overlaps significantly with this text
  const tokens = new Set(norm.split(" ").filter((t) => t.length >= 3));
  if (tokens.size === 0) return null;

  type Score = { tag: DifficultyTag; weight: number };
  const scores: Score[] = [];

  for (const [phrase, entry] of Object.entries(cache)) {
    const pTokens = phrase.split(" ").filter((t) => t.length >= 3);
    if (pTokens.length === 0) continue;
    let matches = 0;
    for (const t of pTokens) if (tokens.has(t)) matches++;
    const overlap = matches / Math.max(pTokens.length, 1);
    if (overlap >= 0.6) {
      scores.push({ tag: entry.tag, weight: entry.hits * overlap });
    }
  }

  if (scores.length === 0) return null;

  // Tally votes weighted by hits
  const totals: Record<DifficultyTag, number> = { easy: 0, medium: 0, hard: 0 };
  for (const s of scores) totals[s.tag] += s.weight;
  const winner = (Object.entries(totals) as [DifficultyTag, number][]).sort(
    (a, b) => b[1] - a[1]
  )[0];
  return winner[1] > 0 ? winner[0] : null;
}

export function rememberTag(text: string, tag: DifficultyTag) {
  const cache = loadCache();
  const norm = normalize(text);
  if (!norm) return;
  const prev = cache[norm];
  cache[norm] = {
    tag,
    hits: (prev?.hits ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  saveCache(cache);
}

export function tagToDifficulty(tag: DifficultyTag): 1 | 2 | 3 {
  if (tag === "easy") return 1;
  if (tag === "hard") return 3;
  return 2;
}

export async function classifyTask(
  text: string
): Promise<{ tag: DifficultyTag; source: "cache" | "llm" }> {
  const cached = lookupCache(text);
  if (cached) return { tag: cached, source: "cache" };

  try {
    const res = await fetch("/api/classify-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { tag?: DifficultyTag };
    const tag: DifficultyTag = data.tag ?? "medium";
    rememberTag(text, tag);
    return { tag, source: "llm" };
  } catch {
    return { tag: "medium", source: "cache" };
  }
}
