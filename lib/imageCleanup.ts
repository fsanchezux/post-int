"use client";

import { SYNCED_KEYS, UPDATED_AT_KEY, REMOTE_UPDATE_EVENT } from "./storage";
import type { Project, ProjectImage } from "./types";

const MAX_IMAGE_DIM = 1200;
const IMAGE_QUALITY = 0.85;
const COMPRESS_THRESHOLD = 80 * 1024; // 80 KB — anything bigger gets recompressed

export type CleanupReport = {
  beforeKB: number;
  afterKB: number;
  savedKB: number;
  imagesRecompressed: number;
  imagesDroppedFromHistory: number;
};

// Estimate the data URL byte size cheaply (base64 ≈ 4/3 of binary).
function dataUrlSize(src: string): number {
  // src looks like "data:image/jpeg;base64,AAAA..."
  const i = src.indexOf(",");
  if (i < 0) return src.length;
  const b64 = src.length - i - 1;
  return Math.floor(b64 * 0.75);
}

async function recompressOne(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(
        1,
        MAX_IMAGE_DIM / img.width,
        MAX_IMAGE_DIM / img.height
      );
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      // We always re-encode as JPEG for cleanup — PNG transparency is rare
      // for sticky-note photos, and JPEG buys 5–20× compression.
      const out = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
      resolve(out.length < src.length ? out : src);
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

export async function cleanupStorage(options?: {
  stripHistoryImages?: boolean;
}): Promise<CleanupReport> {
  const stripHistory = options?.stripHistoryImages ?? true;

  const beforeProjects =
    localStorage.getItem(SYNCED_KEYS.projects) ?? "[]";
  const beforeHistory =
    localStorage.getItem(SYNCED_KEYS.history) ?? "[]";
  const beforeBytes = beforeProjects.length + beforeHistory.length;

  let imagesRecompressed = 0;
  let imagesDroppedFromHistory = 0;

  // ----- Active projects: recompress any oversized image -----
  let projects: Project[] = [];
  try {
    projects = JSON.parse(beforeProjects);
  } catch {
    projects = [];
  }

  for (const p of projects) {
    const imgs = p.images ?? [];
    if (imgs.length === 0) continue;
    const updated: ProjectImage[] = [];
    for (const im of imgs) {
      if (!im.src || !im.src.startsWith("data:image")) {
        updated.push(im);
        continue;
      }
      if (dataUrlSize(im.src) <= COMPRESS_THRESHOLD) {
        updated.push(im);
        continue;
      }
      const newSrc = await recompressOne(im.src);
      if (newSrc !== im.src) imagesRecompressed += 1;
      updated.push({ ...im, src: newSrc });
    }
    p.images = updated;
  }

  // ----- History: drop images (the user already finished those projects) -----
  let history: Project[] = [];
  try {
    history = JSON.parse(beforeHistory);
  } catch {
    history = [];
  }
  if (stripHistory) {
    for (const p of history) {
      if (p.images?.length) {
        imagesDroppedFromHistory += p.images.length;
        p.images = [];
      }
    }
  }

  const afterProjects = JSON.stringify(projects);
  const afterHistory = JSON.stringify(history);

  // Write back. If even the cleaned version exceeds quota, the writeJSON
  // wrapper in storage.ts will catch the error and surface the toast again.
  try {
    localStorage.setItem(SYNCED_KEYS.projects, afterProjects);
    localStorage.setItem(SYNCED_KEYS.history, afterHistory);
    localStorage.setItem(UPDATED_AT_KEY, new Date().toISOString());
    window.dispatchEvent(new Event(REMOTE_UPDATE_EVENT));
  } catch (e) {
    console.warn("[cleanup] write after cleanup still failed", e);
  }

  const afterBytes = afterProjects.length + afterHistory.length;

  return {
    beforeKB: Math.round(beforeBytes / 1024),
    afterKB: Math.round(afterBytes / 1024),
    savedKB: Math.round((beforeBytes - afterBytes) / 1024),
    imagesRecompressed,
    imagesDroppedFromHistory,
  };
}
