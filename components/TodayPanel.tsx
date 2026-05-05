"use client";

import { useEffect, useState } from "react";
import { useProjects, useSettings } from "@/lib/storage";
import {
  buildTodayPlan,
  formatCountdown,
  formatDuration,
  formatHM,
  getWorkSessionInfo,
  tasksOverlappingSession,
  type RawEvent,
  type WorkSessionInfo,
} from "@/lib/today";
import { WidgetCard } from "./WidgetCard";
import { useI18n } from "@/lib/i18n";

export function TodayPanel() {
  const { t, language } = useI18n();
  const { settings, hydrated } = useSettings();
  const { projects } = useProjects();
  const [events, setEvents] = useState<RawEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());

  const locale = language === "ca" ? "ca-ES" : language === "es" ? "es-ES" : "en-US";

  // Tick every 30s for live countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/today", { cache: "no-store" });
      const data = await res.json();
      setConnected(!!data.connected);
      setEvents(data.events ?? []);
      if (data.error) setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const session: WorkSessionInfo = hydrated
    ? getWorkSessionInfo(settings, now)
    : { state: "none" };
  const plan = hydrated ? buildTodayPlan(settings, events, now) : null;
  const taskConflicts = hydrated ? tasksOverlappingSession(projects, session) : [];

  const dayName = now.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const toolbar = (
    <>
      {connected ? (
        <span className="flex items-center gap-1 text-emerald-600 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          GCal
        </span>
      ) : (
        <a
          href="/api/auth/google"
          className="text-xs px-2 py-0.5 rounded border border-zinc-300 hover:bg-zinc-100"
        >
          {t("settings.connect")}
        </a>
      )}
      <button
        onClick={refresh}
        disabled={loading}
        className="text-xs px-2 py-0.5 rounded border border-zinc-300 hover:bg-zinc-100 disabled:opacity-50"
        title="Refresh"
      >
        {loading ? "…" : "↻"}
      </button>
    </>
  );

  let summary: React.ReactNode = null;
  if (session.state === "active") {
    summary = (
      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-widest font-semibold text-emerald-700">
          {language === "es"
            ? "En sesión laboral"
            : language === "ca"
            ? "En sessió laboral"
            : "In work session"}
        </div>
        <div className="text-2xl font-bold leading-tight">
          {formatCountdown(session.remainingMinutes)}
        </div>
        <div className="text-xs opacity-70">
          {language === "es"
            ? "para acabar"
            : language === "ca"
            ? "per acabar"
            : "remaining"}{" "}
          · {formatHM(session.start)}–{formatHM(session.end)}
        </div>
      </div>
    );
  } else if (session.state === "upcoming") {
    summary = (
      <div className="space-y-1">
        <div className="text-[11px] uppercase tracking-widest font-semibold opacity-70">
          {language === "es"
            ? "Próxima sesión laboral"
            : language === "ca"
            ? "Pròxima sessió laboral"
            : "Next work session"}
        </div>
        <div className="text-2xl font-bold leading-tight">
          {language === "es" || language === "ca" ? "en " : "in "}
          {formatCountdown(session.minutesUntilStart)}
        </div>
        <div className="text-xs opacity-70">
          {session.start.toLocaleString(locale, {
            weekday: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          → {formatHM(session.end)}
        </div>
      </div>
    );
  } else {
    summary = (
      <p className="text-xs opacity-70">
        {language === "es"
          ? "Sin horario definido."
          : language === "ca"
          ? "Sense horari definit."
          : "No schedule defined."}{" "}
        <a href="/settings" className="underline">
          {language === "es" || language === "ca" ? "Editar" : "Edit"}
        </a>
      </p>
    );
  }

  const detail = (
    <div className="space-y-2">
      {/* Task deadlines that overlap this session */}
      {taskConflicts.length > 0 && (
        <div className="rounded border-2 border-amber-400 bg-amber-50 p-2">
          <div className="text-xs font-bold text-amber-800">
            {language === "es"
              ? "⚠ Tareas con deadline en esta sesión"
              : language === "ca"
              ? "⚠ Tasques amb deadline en aquesta sessió"
              : "⚠ Tasks deadlining in this session"}
          </div>
          <ul className="mt-1 space-y-0.5 text-xs">
            {taskConflicts.map((c) => (
              <li
                key={c.projectId}
                className="flex items-center justify-between gap-2 text-amber-900"
              >
                <span className="truncate">{c.projectName}</span>
                <span className="font-mono whitespace-nowrap">{c.endDate}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Calendar conflicts inside the work block */}
      {plan && plan.hasWork && plan.conflicts.length > 0 && (
        <div className="rounded border-2 border-red-400 bg-red-50 p-2">
          <div className="text-xs font-bold text-red-700">
            {language === "es"
              ? "⚠ Conflictos con el calendario"
              : language === "ca"
              ? "⚠ Conflictes amb el calendari"
              : "⚠ Calendar conflicts"}
          </div>
          <ul className="mt-1 space-y-0.5 text-xs">
            {plan.conflicts.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 text-red-800"
              >
                <span className="truncate">{c.summary}</span>
                <span className="font-mono whitespace-nowrap">
                  {c.allDay ? "all day" : `${formatHM(c.start)}–${formatHM(c.end)}`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan && plan.hasWork && plan.freeMinutes > 0 && plan.conflicts.length === 0 && (
        <p className="text-xs opacity-70">
          {formatDuration(plan.freeMinutes)}{" "}
          {language === "es" ? "libres en la sesión" : language === "ca" ? "lliures en la sessió" : "free in the session"}
        </p>
      )}

      {error && <p className="text-xs text-red-600">⚠ {error}</p>}
    </div>
  );

  return (
    <WidgetCard
      title={<>Today · {dayName}</>}
      toolbar={toolbar}
      summary={summary}
      detail={detail}
    />
  );
}
