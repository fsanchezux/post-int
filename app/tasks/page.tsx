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

const CARD_W = 360;
const CARD_GAP = 24;

function TaskCard({ item }: { item: CarouselItem }) {
  const tag = item.task.autoTag ?? "medium";
  const tagS = TAG_STYLE[tag];
  const cardColor = item.project.color || POSTIT_PALETTE[2];

  return (
    <article
      className="carousel-card rounded-3xl p-6 md:p-8 shadow-xl shrink-0"
      style={{
        background: cardColor,
        color: "#1c1c1c",
        width: CARD_W,
        height: 440,
      }}
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
  const [currentIdx, setCurrentIdx] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const dragRef = useRef<{ active: boolean; startX: number; startOffset: number }>({
    active: false,
    startX: 0,
    startOffset: 0,
  });

  const items: CarouselItem[] = useMemo(() => {
    const out: CarouselItem[] = [];
    for (const p of projects) {
      for (const t of p.tasks) {
        if (!t.done) out.push({ task: t, project: p });
      }
    }
    return out;
  }, [projects]);

  const cardStep = CARD_W + CARD_GAP;

  const applyTransform = useCallback((offset: number, duration = 0) => {
    const t = trackRef.current;
    if (!t) return;
    offsetRef.current = offset;
    t.style.transition =
      duration === 0 ? "none" : `transform ${duration}s cubic-bezier(0.22, 1, 0.36, 1)`;
    t.style.transform = `translate3d(${offset}px, 0, 0)`;
  }, []);

  const styleCards = useCallback((activeIdx: number) => {
    if (!trackRef.current) return;
    const cards = trackRef.current.querySelectorAll<HTMLElement>(".carousel-card");
    cards.forEach((card, i) => {
      const dist = Math.abs(i - activeIdx);
      const scale = dist === 0 ? 1 : Math.max(0.78, 1 - dist * 0.12);
      const opacity = dist === 0 ? 1 : Math.max(0.25, 1 - dist * 0.35);
      gsap.to(card, {
        scale,
        opacity,
        duration: 0.35,
        ease: "power2.out",
        overwrite: "auto",
      });
    });
  }, []);

  const goTo = useCallback(
    (idx: number, animate: boolean | number = true) => {
      if (items.length === 0) return;
      const clamped = ((idx % items.length) + items.length) % items.length;
      setCurrentIdx(clamped);
      const offset = -clamped * cardStep;
      const dur = typeof animate === "number" ? animate : animate ? 0.5 : 0;
      applyTransform(offset, dur);
      styleCards(clamped);
    },
    [items.length, cardStep, applyTransform, styleCards]
  );

  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    requestAnimationFrame(() => {
      goTo(0, false);
    });
  }, [hydrated, items.length, goTo]);

  useEffect(() => {
    const onResize = () => goTo(currentIdx, false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [goTo, currentIdx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(currentIdx + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(currentIdx - 1);
      } else if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        goTo(currentIdx + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, currentIdx]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    let lastWheel = 0;
    const onWheel = (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(dx) < 5) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheel < 600) return;
      lastWheel = now;
      goTo(currentIdx + (dx > 0 ? 1 : -1), 0.9);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [goTo, currentIdx]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!trackRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startOffset: offsetRef.current,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    applyTransform(dragRef.current.startOffset + dx, 0);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) < 8) return;
    const moved = Math.round(-dx / cardStep);
    goTo(currentIdx + moved);
  };

  if (!hydrated) return null;

  const empty = items.length === 0;
  const current = items[currentIdx] ?? null;

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

  return (
    <main className="max-w-6xl mx-auto px-2 md:px-6 pb-12 pt-2">
      <div className="flex items-center justify-between mb-4 px-4">
        <p className="text-xs uppercase tracking-widest opacity-60">
          {t("Carrusel de tareas", "Carrusel de tasques", "Task carousel")}
        </p>
        <p className="text-xs opacity-60 hidden sm:block">
          {t("Arrastra o usa", "Arrossega o usa", "Drag or use")}{" "}
          <kbd className="px-1.5 py-0.5 rounded border bg-white/60 font-mono">
            ←
          </kbd>{" "}
          <kbd className="px-1.5 py-0.5 rounded border bg-white/60 font-mono">
            →
          </kbd>
        </p>
      </div>

      <div
        ref={viewportRef}
        className="relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{ touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          ref={trackRef}
          className="flex items-center py-8"
          style={{
            gap: `${CARD_GAP}px`,
            paddingLeft: `calc(50% - ${CARD_W / 2}px)`,
            paddingRight: `calc(50% - ${CARD_W / 2}px)`,
            willChange: "transform",
          }}
        >
          {items.map((it) => (
            <TaskCard key={it.task.id} item={it} />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => goTo(currentIdx - 1)}
          className="px-3 py-2 rounded-full font-semibold text-sm bg-white/70 hover:bg-white"
          aria-label={t("Anterior", "Anterior", "Previous")}
        >
          ←
        </button>
        <button
          onClick={toggleDone}
          className="px-4 py-2 rounded-full font-semibold text-sm bg-zinc-900 text-white hover:bg-zinc-800"
        >
          ✓ {t("Hecho", "Fet", "Done")}
        </button>
        <button
          onClick={sendToCalendar}
          className="px-4 py-2 rounded-full font-semibold text-sm bg-white/70 hover:bg-white"
          title={t(
            "Añadir a Google Calendar",
            "Afegir a Google Calendar",
            "Add to Google Calendar"
          )}
        >
          📅 {t("Calendar", "Calendar", "Calendar")}
        </button>
        <button
          onClick={() => goTo(currentIdx + 1)}
          className="px-3 py-2 rounded-full font-semibold text-sm bg-white/70 hover:bg-white"
          aria-label={t("Siguiente", "Següent", "Next")}
        >
          →
        </button>
      </div>

      <p className="mt-4 text-center text-xs opacity-50">
        {`${currentIdx + 1} / ${items.length}`}
      </p>
    </main>
  );
}
