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

function TaskCard({
  item,
  className = "",
  style = {},
  onClick,
}: {
  item: CarouselItem;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  const tag = item.task.autoTag ?? "medium";
  const tagS = TAG_STYLE[tag];
  const cardColor = item.project.color || POSTIT_PALETTE[2];

  return (
    <article
      className={`task-card rounded-3xl p-8 shadow-xl ${className}`}
      style={{ background: cardColor, color: "#1c1c1c", ...style }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <span
          className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded"
          style={{ background: tagS.bg, color: tagS.color }}
        >
          {tag}
        </span>
        <span className="text-xs opacity-70 truncate max-w-[55%]">
          {item.project.name}
        </span>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold leading-snug">
        {item.task.text}
      </h2>

      {item.project.description && (
        <p className="mt-3 text-sm opacity-80 line-clamp-3">
          {item.project.description}
        </p>
      )}
    </article>
  );
}

export default function TasksPage() {
  const { projects, hydrated, updateProject } = useProjects();
  const { settings } = useSettings();
  const { language } = useI18n();
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const initRef = useRef(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

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

  useEffect(() => {
    if (!hydrated || initRef.current) return;
    if (items.length > 0) {
      const idx = pickRandomIndex(items, new Set());
      setCurrentIdx(idx);
      initRef.current = true;
    }
  }, [hydrated, items]);

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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      advance();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [advance]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      advance();
    }
  };

  if (!hydrated) return null;

  const empty = items.length === 0;
  const current = currentIdx !== null ? items[currentIdx] ?? null : null;

  const prevIdx = currentIdx !== null ? (currentIdx - 1 + items.length) % items.length : null;
  const nextIdx = currentIdx !== null ? (currentIdx + 1) % items.length : null;
  const prevItem = prevIdx !== null ? items[prevIdx] : null;
  const nextItem = nextIdx !== null ? items[nextIdx] : null;

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

      <div
        ref={carouselRef}
        className="relative h-[60vh] grid place-items-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {prevItem && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/4 md:-translate-x-1/3 w-[60%] max-w-sm opacity-40 pointer-events-none select-none">
            <TaskCard item={prevItem} className="scale-90" />
          </div>
        )}
        {nextItem && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 md:translate-x-1/3 w-[60%] max-w-sm opacity-40 pointer-events-none select-none">
            <TaskCard item={nextItem} className="scale-90" />
          </div>
        )}

        <div
          key={animKey}
          className="w-full max-w-xl z-10"
        >
          <TaskCard item={current} />

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
          </div>
        </div>
      </div>

      {isMobile && (
        <button
          onClick={advance}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-zinc-900 text-white shadow-lg flex items-center justify-center text-xl z-50 hover:bg-zinc-800 active:scale-95 transition-transform"
          aria-label={t("Tarea aleatoria", "Tasca aleatòria", "Random task")}
          title={t("Tarea aleatoria", "Tasca aleatòria", "Random task")}
        >
          🎲
        </button>
      )}

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
