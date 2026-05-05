"use client";

import { useEffect, useState } from "react";
import { dismissOutsideHours, recentOutsideHours } from "@/lib/outsideHours";
import { useI18n } from "@/lib/i18n";
import { outsideHoursPhrase } from "@/lib/phrases";

export function OutsideHoursWidget() {
  const { language } = useI18n();
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(recentOutsideHours().length);
    const onStorage = () => setCount(recentOutsideHours().length);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (count === 0) return null;

  const phrase = outsideHoursPhrase(language);
  const dismissLabel =
    language === "es" ? "Entendido" : language === "ca" ? "Entès" : "Got it";

  return (
    <div
      className="widget-card h-full w-full rounded-2xl flex flex-col overflow-hidden"
      style={{ background: "var(--postit-blue)" }}
    >
      <div className="widget-drag-handle cursor-move flex items-center justify-between gap-2 px-4 pt-4 select-none">
        <div className="text-[11px] font-semibold uppercase tracking-widest opacity-70 truncate">
          {language === "es" ? "Aviso" : language === "ca" ? "Avís" : "Heads up"}
        </div>
      </div>
      <div className="flex-1 px-4 pb-4 flex flex-col justify-between gap-3">
        <p className="text-base font-medium leading-snug">{phrase}</p>
        <button
          onClick={() => {
            dismissOutsideHours();
            setCount(0);
          }}
          className="self-start text-xs underline opacity-70 hover:opacity-100"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  );
}
