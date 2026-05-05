"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProjects, useSettings } from "@/lib/storage";
import type { CalendarEvent, WorkSlot, Language } from "@/lib/types";
import { recommend } from "@/lib/recommend";
import { useI18n, languageNames, dayNames } from "@/lib/i18n";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const { settings, updateSettings, hydrated } = useSettings();
  const { projects } = useProjects();
  const { t, language, setLanguage } = useI18n();
  const params = useSearchParams();
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [tagCacheCount, setTagCacheCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/auth/google/status")
      .then((r) => r.json())
      .then((d) => setGoogleConnected(!!d.connected))
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("pmw:task-tag-cache");
      if (raw) setTagCacheCount(Object.keys(JSON.parse(raw)).length);
    } catch {}
  }, []);

  useEffect(() => {
    const g = params.get("google");
    if (g === "connected") setStatusMsg(t("settings.googleConnected"));
    else if (g === "error")
      setStatusMsg(`${t("settings.googleError")}: ${params.get("reason") ?? "unknown"}`);
    if (g) {
      const t2 = setTimeout(() => setStatusMsg(null), 5000);
      return () => clearTimeout(t2);
    }
  }, [params, t]);

  const disconnectGoogle = async () => {
    await fetch("/api/auth/google/disconnect", { method: "POST" });
    setGoogleConnected(false);
    setStatusMsg(t("settings.googleDisconnected"));
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const recommendations = useMemo(
    () => recommend(projects, settings),
    [projects, settings]
  );

  if (!hydrated) return null;

  const setSchedule = (next: WorkSlot[]) => updateSettings({ workSchedule: next });

  const updateSlot = (i: number, patch: Partial<WorkSlot>) => {
    setSchedule(settings.workSchedule.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const addSlot = () =>
    setSchedule([...settings.workSchedule, { day: 1, start: "09:00", end: "13:00" }]);

  const removeSlot = (i: number) =>
    setSchedule(settings.workSchedule.filter((_, idx) => idx !== i));

  const addEvent = () => {
    if (!eventTitle || !eventStart || !eventEnd) return;
    const ev: CalendarEvent = {
      id: Math.random().toString(36).slice(2),
      title: eventTitle,
      start: eventStart,
      end: eventEnd,
      source: "manual",
    };
    updateSettings({ events: [...settings.events, ev] });
    setEventTitle("");
    setEventStart("");
    setEventEnd("");
  };

  const removeEvent = (id: string) =>
    updateSettings({ events: settings.events.filter((e) => e.id !== id) });

  const clearTagCache = () => {
    window.localStorage.removeItem("pmw:task-tag-cache");
    setTagCacheCount(0);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    updateSettings({ language: lang });
  };

  const days = dayNames[language];

  return (
    <main className="max-w-4xl mx-auto px-6 pb-12 space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("settings.language")}</h2>
        <div className="flex gap-2">
          {(Object.keys(languageNames) as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`px-4 py-2 rounded border ${
                settings.language === lang
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-transparent hover:bg-zinc-100"
              }`}
            >
              {languageNames[lang]}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("settings.autoTagging")}</h2>
        <p className="text-sm opacity-70 max-w-prose">
          {t("settings.autoTaggingDesc")}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-sm">
            {t("settings.rememberedPhrases")}: <strong>{tagCacheCount}</strong>
          </span>
          <button
            onClick={clearTagCache}
            className="text-xs px-3 py-1 rounded border"
          >
            {t("settings.clearMemory")}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("settings.workSchedule")}</h2>
          <button onClick={addSlot} className="text-sm px-3 py-1 rounded border">
            {t("settings.addSlot")}
          </button>
        </div>
        <ul className="space-y-2">
          {settings.workSchedule.map((slot, i) => (
            <li key={i} className="flex items-center gap-2 flex-wrap">
              <select
                value={slot.day}
                onChange={(e) => updateSlot(i, { day: Number(e.target.value) })}
                className="border rounded px-2 py-1 bg-transparent"
              >
                {days.map((d, idx) => (
                  <option key={idx} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={slot.start}
                onChange={(e) => updateSlot(i, { start: e.target.value })}
                className="border rounded px-2 py-1 bg-transparent"
              />
              <span>→</span>
              <input
                type="time"
                value={slot.end}
                onChange={(e) => updateSlot(i, { end: e.target.value })}
                className="border rounded px-2 py-1 bg-transparent"
              />
              <button
                onClick={() => removeSlot(i)}
                className="text-xs text-red-600"
              >
                {t("project.delete")}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("settings.connections")}</h2>
        <div className="border rounded-lg p-4 max-w-md bg-white/60">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t("settings.googleCalendar")}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                googleConnected
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {googleConnected ? t("settings.connected") : t("settings.pending")}
            </span>
          </div>
          <p className="text-xs opacity-70 mt-1">
            {t("settings.googleCalendarDesc")}
          </p>
          {googleConnected ? (
            <button
              onClick={disconnectGoogle}
              className="mt-2 text-xs px-3 py-1 rounded border"
            >
              {t("settings.disconnect")}
            </button>
          ) : (
            <a
              href="/api/auth/google"
              className="mt-2 inline-block text-xs px-3 py-1 rounded bg-zinc-900 text-white"
            >
              {t("settings.connect")}
            </a>
          )}
          {statusMsg && <p className="text-xs mt-2 opacity-80">{statusMsg}</p>}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("settings.manualEvents")}</h2>
        <div className="flex gap-2 flex-wrap items-end">
          <label className="flex-1 min-w-[160px]">
            <span className="text-xs">{t("settings.eventTitle")}</span>
            <input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              className="w-full border rounded px-2 py-1 bg-transparent"
            />
          </label>
          <label>
            <span className="text-xs">{t("settings.eventStart")}</span>
            <input
              type="datetime-local"
              value={eventStart}
              onChange={(e) => setEventStart(e.target.value)}
              className="border rounded px-2 py-1 bg-transparent"
            />
          </label>
          <label>
            <span className="text-xs">{t("settings.eventEnd")}</span>
            <input
              type="datetime-local"
              value={eventEnd}
              onChange={(e) => setEventEnd(e.target.value)}
              className="border rounded px-2 py-1 bg-transparent"
            />
          </label>
          <button
            onClick={addEvent}
            className="px-3 py-1 rounded bg-zinc-900 text-white"
          >
            {t("settings.addEvent")}
          </button>
        </div>
        {settings.events.length > 0 && (
          <ul className="text-sm space-y-1">
            {settings.events.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between border-b py-1"
              >
                <span>
                  <strong>{e.title}</strong>{" "}
                  <span className="opacity-60">
                    {new Date(e.start).toLocaleString(language === "ca" ? "ca-ES" : language === "es" ? "es-ES" : "en-US")} →{" "}
                    {new Date(e.end).toLocaleTimeString(language === "ca" ? "ca-ES" : language === "es" ? "es-ES" : "en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <button
                  onClick={() => removeEvent(e.id)}
                  className="text-xs text-red-600"
                >
                  {t("settings.deleteEvent")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("settings.freeSlots")}</h2>
        {recommendations.length === 0 ? (
          <p className="text-sm opacity-60">
            {t("settings.noFreeSlots")}
          </p>
        ) : (
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li
                key={i}
                className="border-l-4 border-emerald-500 bg-emerald-50/40 rounded p-3"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm">
                    <strong>{days[r.slot.day]}</strong> {r.slot.date} ·{" "}
                    {r.slot.start} → {r.slot.end}{" "}
                    <span className="opacity-60">
                      ({Math.round(r.slot.durationMinutes)} {t("settings.duration")})
                    </span>
                  </span>
                  <span className="text-sm font-semibold">{r.projectName}</span>
                </div>
                <p className="text-xs opacity-70 mt-1">{r.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}