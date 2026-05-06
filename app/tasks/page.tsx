"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
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
  cardRef,
}: {
  item: CarouselItem;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const tag = item.task.autoTag ?? "medium";
  const tagS = TAG_STYLE[tag];
  const cardColor = item.project.color || POSTIT_PALETTE[2];

  return (
    <article
      ref={cardRef}
      className={`rounded-3xl p-6 md:p-8 shadow-xl ${className}`}
      style={{ background: cardColor, color: "#1c1c1c", ...style }}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3 mb-3 md:mb-4">
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

      <h2 className="text-xl md:text-3xl font-bold leading-snug">
        {item.task.text}
      </h2>

      {item.project.description && (
        <p className="mt-2 md:mt-3 text-sm opacity-80 line-clamp-3">
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
  const [spinning, setSpinning] = useState(false);
  const initRef = useRef(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const spinRef = useRef<HTMLDivElement | null>(null);
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

  const animateCardIn = useCallback(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 30, scale: 0.92, rotation: -4 },
      { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.45, ease: "back.out(1.7)" }
    );
  }, []);

  useEffect(() => {
    animateCardIn();
  }, [animKey, animateCardIn]);

  const advance = useCallback((spin = false) => {
    if (spin && isMobile) {
      setSpinning(true);
      if (spinRef.current) {
        gsap.to(spinRef.current, {
          rotation: 720,
          scale: 0.8,
          duration: 0.35,
          ease: "power2.in",
          onComplete: () => {
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
            setSpinning(false);
            if (spinRef.current) {
              gsap.fromTo(
                spinRef.current,
                { rotation: 0, scale: 0.8, opacity: 0 },
                { rotation: 0, scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
              );
            }
          },
        });
      }
    } else {
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          x: -80,
          opacity: 0,
          rotation: -6,
          duration: 0.2,
          ease: "power2.in",
          onComplete: () => {
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
          },
        });
      } else {
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
      }
    }
  }, [items, currentIdx, isMobile]);

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
    setTimeout(() => advance(), 250);
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
        className="relative h-[60vh] md:h-[65vh] grid place-items-center overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {prevItem && (
          <div className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 -translate-x-[55%] md:-translate-x-[45%] w-[50%] md:w-[38%] opacity-25 pointer-events-none select-none z-0">
            <TaskCard item={prevItem} className="scale-90" />
          </div>
        )}
        {nextItem && (
          <div className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 translate-x-[55%] md:translate-x-[45%] w-[50%] md:w-[38%] opacity-25 pointer-events-none select-none z-0">
            <TaskCard item={nextItem} className="scale-90" />
          </div>
        )}

        <div
          key={animKey}
          className="w-full max-w-xl z-10"
          ref={spinRef}
        >
          <TaskCard item={current} cardRef={cardRef} />

          <div className="mt-4 md:mt-6 flex flex-wrap gap-2">
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
          onClick={() => advance(true)}
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
    </main>
  );
}
