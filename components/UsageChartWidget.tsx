"use client";

import { useEffect, useState } from "react";
import { usageHistory } from "@/lib/usageTracker";
import { useI18n } from "@/lib/i18n";

export function UsageChartWidget() {
  const { language } = useI18n();
  const [data, setData] = useState<Array<{ date: string; opened: boolean }>>([]);

  useEffect(() => {
    setData(usageHistory(30));
  }, []);

  const openedCount = data.filter((d) => d.opened).length;
  const locale = language === "ca" ? "ca-ES" : language === "es" ? "es-ES" : "en-US";
  const title =
    language === "es"
      ? "Días en la app (30d)"
      : language === "ca"
      ? "Dies a l'app (30d)"
      : "Days in app (30d)";
  const caption =
    language === "es"
      ? `${openedCount} de 30 días`
      : language === "ca"
      ? `${openedCount} de 30 dies`
      : `${openedCount} of 30 days`;

  return (
    <div
      className="widget-card h-full w-full rounded-2xl flex flex-col overflow-hidden"
      style={{ background: "var(--postit-yellow)" }}
    >
      <div className="widget-drag-handle cursor-move flex items-center justify-between gap-2 px-4 pt-4 select-none">
        <div className="text-[11px] font-semibold uppercase tracking-widest opacity-70 truncate">
          {title}
        </div>
      </div>
      <div className="flex-1 px-4 pb-4 flex flex-col justify-end gap-2">
        <div className="flex items-end gap-[3px] h-12">
          {data.map((d) => {
            const today = new Date().toISOString().slice(0, 10) === d.date;
            return (
              <div
                key={d.date}
                title={`${new Date(d.date).toLocaleDateString(locale)}${
                  d.opened ? " ✓" : ""
                }`}
                className="flex-1 rounded-sm transition-colors"
                style={{
                  height: d.opened ? "100%" : "20%",
                  background: d.opened
                    ? today
                      ? "#111"
                      : "rgba(0,0,0,0.55)"
                    : "rgba(0,0,0,0.12)",
                }}
              />
            );
          })}
        </div>
        <div className="text-xs opacity-70">{caption}</div>
      </div>
    </div>
  );
}
