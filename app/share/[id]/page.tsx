"use client";

import { use, useEffect, useState } from "react";
import type { SharePayload } from "@/lib/shareStore";
import { useI18n } from "@/lib/i18n";

const TAG_STYLE = {
  easy: { bg: "#111111", color: "#ffffff" },
  medium: { bg: "rgba(0,0,0,0.10)", color: "#1c1c1c" },
  hard: { bg: "#ef4444", color: "#ffffff" },
} as const;

export default function SharePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, language } = useI18n();
  const { id } = use(params);
  const [data, setData] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const locale = language === "ca" ? "ca-ES" : language === "es" ? "es-ES" : "en-US";

  const tagLabel = (tag: string) => {
    switch (tag) {
      case "easy": return t("task.easy");
      case "hard": return t("task.hard");
      default: return t("task.medium");
    }
  };

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/share/${id}`, { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 404) {
          setError(t("share.notFound"));
          return;
        }
        if (!res.ok) {
          setError(t("common.loading") + " error");
          return;
        }
        const json = (await res.json()) as SharePayload;
        setData(json);
        setLastUpdated(json.updatedAt);
        setError(null);
      } catch {
        if (!cancelled) setError("Network error");
      }
    };
    tick();
    const t2 = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(t2);
    };
  }, [id, t]);

  if (error) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <p className="text-sm opacity-70">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <p className="text-sm opacity-50">{t("common.loading")}</p>
      </main>
    );
  }

  const total = data.tasks.length;
  const done = data.tasks.filter((t) => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <main className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <div
        className="rounded-2xl p-6 shadow-sm"
        style={{ background: data.color ?? "#f0ecbc", color: "#1c1c1c" }}
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">
            {data.paid && "💰 "}
            {data.name}
          </h1>
          {data.paid && data.amount != null && (
            <span className="text-lg font-bold">
              {data.amount.toLocaleString(locale, {
                style: "currency",
                currency: "EUR",
              })}
            </span>
          )}
        </div>

        {data.description && (data.showDescription ?? true) && (
          <p className="mt-2 text-sm whitespace-pre-wrap opacity-85">
            {data.description}
          </p>
        )}

        {data.links && data.links.length > 0 && (
          <div className="mt-3 flex flex-col gap-1">
            {data.links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline truncate"
              >
                🔗 {l.label || l.url.replace(/^https?:\/\//, "")}
              </a>
            ))}
          </div>
        )}

        {(data.showProgress ?? true) && total > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(0,0,0,.15)" }}
            >
              <div
                className="h-full"
                style={{ width: `${pct}%`, background: "rgba(0,0,0,.55)" }}
              />
            </div>
            <span className="font-mono text-sm">{pct}%</span>
          </div>
        )}

        {(data.startDate || data.endDate) && (
          <p className="mt-2 text-xs opacity-70">
            {data.startDate ?? "—"} → {data.endDate ?? "—"}
          </p>
        )}

        <ul className="mt-5 space-y-2">
          {data.tasks.map((task) => {
            const tag = task.autoTag ?? "medium";
            const s = TAG_STYLE[tag];
            return (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block w-4 h-4 rounded border border-black/30 grid place-items-center"
                  style={{ background: task.done ? "rgba(0,0,0,.55)" : "transparent" }}
                  aria-label={task.done ? t("task.done") : t("settings.pending")}
                >
                  {task.done && <span className="text-white text-[10px] leading-none">✓</span>}
                </span>
                <span
                  className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded shrink-0 min-w-[58px] text-center"
                  style={{ background: s.bg, color: s.color }}
                >
                  {tagLabel(tag)}
                </span>
                <span className={task.done ? "line-through opacity-60" : ""}>
                  {task.text}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="mt-4 text-center text-xs opacity-50">
        Read-only · updates every 3s · last version:{" "}
        {lastUpdated ? new Date(lastUpdated).toLocaleString(locale) : "—"}
      </p>
    </main>
  );
}