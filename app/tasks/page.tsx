"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useProjects, useSettings } from "@/lib/storage";
import { isWithinWorkHours } from "@/lib/today";
import { recordOutsideHours } from "@/lib/outsideHours";
import { useI18n } from "@/lib/i18n";
import type { Project, Task } from "@/lib/types";
import { POSTIT_PALETTE } from "@/lib/colors";

type CarouselItem = {
  task: Task;
  project: Project;
};

const TAG_STYLE = {
  easy: { bg: "#111111", color: "#ffffff" },
  medium: { bg: "rgba(0,0,0,0.10)", color: "#1c1c1c" },
  hard: { bg: "#ef4444", color: "#ffffff" },
} as const;

function pickRandomIndex(items: CarouselItem[], seenIds: Set<string>): number | null {
  const candidates = items
    .map((item, idx) => (seenIds.has(item.task.id) ? -1 : idx))
    .filter((idx) => idx >= 0);
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export default function TasksPage() {
  const { projects, hydrated, updateProject } = useProjects();
  const { settings } = useSettings();
  const { language } = useI18n();
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const initRef = useRef(false);

  const items: CarouselItem[] = useMemo(() => {
    const out: CarouselItem[] = [];
    for (const p of projects) {
      for (const t of p.tasks) {
        if (!t.done) out.push({ task: t, project: p });
      }
    }
    return out;
  }, [projects]);

  const advance = useCallback(() => {
    setSeen((prev) => {
      const next = new Set(prev);
      if (currentIdx !== null && items[currentIdx]) {
        next.add(items[currentIdx].task.id);
      }
      // Pick from items minus next set; if exhausted, reset
      let pickFrom = next;
      if (items.every((it) => pickFrom.has(it.task.id))) {
        pickFrom = new Set();
      }
      const idx = pickRandomIndex(items, pickFrom);
      setCurrentIdx(idx);
      setAnimKey((k) => k + 1);
      return pickFrom;
    });
  }, [items, currentIdx]);

  // Initialize random pick once data is ready.
  useEffect(() => {
    if (!hydrated || initRef.current) return;
    if (items.length > 0) {
      const idx = pickRandomIndex(items, new Set());
      setCurrentIdx(idx);
      initRef.current = true;
    }
  }, [hydrated, items]);

  // Ctrl+, keyboard shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        advance();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        if (
          (e.target as HTMLElement | null)?.tagName === "INPUT" ||
          (e.target as HTMLElement | null)?.tagName === "TEXTAREA"
        )
          return;
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  if (!hydrated) return null;

  const empty = items.length === 0;
  const current = currentIdx !== null ? items[currentIdx] ?? null : null;

  const toggleDone = () => {
    if (!current) return;
    const tasks = current.project.tasks.map((t) => {
      if (t.id !== current.task.id) return t;
      const done = !t.done;
      if (done && !isWithinWorkHours(settings)) {
        recordOutsideHours(current.project.id, current.task.id);
      }
      return { ...t, done, doneAt: done ? new Date().toISOString() : undefined };
    });
    updateProject(current.project.id, { tasks });
    setTimeout(advance, 250);
  };

  const sendToCalendar = async () => {
    if (!current) return;
    try {
      const res = await fetch("/api/calendar/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: current.task.text,
          description: `From: ${current.project.name}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Could not create event");
        return;
      }
      alert(
        language === "es"
          ? "Evento creado en Google Calendar"
          : language === "ca"
          ? "Event creat a Google Calendar"
          : "Event created on Google Calendar"
      );
    } catch {
      alert("Network error");
    }
  };

  const t = (es: string, ca: string, en: string) =>
    language === "es" ? es : language === "ca" ? ca : en;

  if (empty) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">
          {t("Sin tareas pendientes", "Sense tasques pendents", "No pending tasks")}
        </h1>
        <p className="mt-2 opacity-70">
          {t(
            "Crea posits con tareas para usar el carrusel.",
            "Crea posits amb tasques per usar el carrusel.",
            "Add posits with tasks to use the carousel."
          )}
        </p>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-16 text-center">
        <p className="opacity-70">{t("Cargando…", "Carregant…", "Loading…")}</p>
      </main>
    );
  }

  const tag = current.task.autoTag ?? "medium";
  const tagS = TAG_STYLE[tag];
  const cardColor = current.project.color || POSTIT_PALETTE[2];

  return (
    <main className="max-w-3xl mx-auto px-6 pb-12 pt-2">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-widest opacity-60">
          {t("Carrusel de tareas", "Carrusel de tasques", "Task carousel")}
        </p>
        <p className="text-xs opacity-60">
          <kbd className="px-1.5 py-0.5 rounded border bg-white/60 font-mono">
            Ctrl+,
          </kbd>{" "}
          {t("siguiente", "següent", "next")}
        </p>
      </div>

      <div className="relative h-[60vh] grid place-items-center">
        <article
          key={animKey}
          className="task-card w-full max-w-xl rounded-3xl p-8 shadow-xl"
          style={{ background: cardColor, color: "#1c1c1c" }}
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <span
              className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded"
              style={{ background: tagS.bg, color: tagS.color }}
            >
              {tag}
            </span>
            <span className="text-xs opacity-70 truncate max-w-[55%]">
              {current.project.name}
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold leading-snug">
            {current.task.text}
          </h2>

          {current.project.description && (
            <p className="mt-3 text-sm opacity-80 line-clamp-3">
              {current.project.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={toggleDone}
              className="px-4 py-2 rounded-full font-semibold text-sm bg-zinc-900 text-white hover:bg-zinc-800"
            >
              ✓ {t("Hecho", "Fet", "Done")}
            </button>
            <button
              onClick={sendToCalendar}
              className="px-4 py-2 rounded-full font-semibold text-sm bg-white/70 hover:bg-white"
              title={t("Añadir a Google Calendar", "Afegir a Google Calendar", "Add to Google Calendar")}
            >
              📅 {t("Calendar", "Calendar", "Calendar")}
            </button>
            <button
              onClick={advance}
              className="px-4 py-2 rounded-full font-semibold text-sm bg-white/40 hover:bg-white/70 ml-auto"
            >
              {t("Siguiente", "Següent", "Next")} →
            </button>
          </div>
        </article>
      </div>

      <p className="mt-6 text-center text-xs opacity-50">
        {t(
          `${seen.size} vistas en esta sesión · ${items.length - seen.size - 1} restantes`,
          `${seen.size} vistes en aquesta sessió · ${items.length - seen.size - 1} restants`,
          `${seen.size} seen this session · ${items.length - seen.size - 1} remaining`
        )}
      </p>

      <style jsx>{`
        .task-card {
          animation: slideIn 280ms ease both;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98) rotate(-1deg);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
        }
      `}</style>
    </main>
  );
}
