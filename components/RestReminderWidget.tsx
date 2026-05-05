"use client";

import { useI18n } from "@/lib/i18n";
import { dailyStreakPhrase } from "@/lib/phrases";

type Props = {
  streak: number;
};

export function RestReminderWidget({ streak }: Props) {
  const { language } = useI18n();
  const phrase = dailyStreakPhrase(streak, language);
  const shouldRest = streak >= 7;
  return (
    <div
      className="widget-card h-full w-full rounded-2xl flex flex-col overflow-hidden"
      style={{ background: shouldRest ? "var(--postit-red)" : "var(--postit-green)" }}
    >
      <div className="widget-drag-handle cursor-move flex items-center justify-between gap-2 px-4 pt-4 select-none">
        <div className="text-[11px] font-semibold uppercase tracking-widest opacity-70 truncate">
          {language === "es"
            ? "Racha diaria"
            : language === "ca"
            ? "Ratxa diària"
            : "Daily streak"}
        </div>
      </div>
      <div className="flex-1 px-4 pb-4 flex flex-col justify-end">
        <div className="text-3xl font-bold leading-none mb-2">
          {streak} {streak === 1
            ? language === "es"
              ? "día"
              : language === "ca"
              ? "dia"
              : "day"
            : language === "es"
            ? "días"
            : language === "ca"
            ? "dies"
            : "days"}
        </div>
        <p className="text-sm opacity-85 leading-snug">{phrase}</p>
      </div>
    </div>
  );
}
