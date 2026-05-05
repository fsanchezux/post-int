"use client";

import { useMemo } from "react";
import type { Mood, Project } from "@/lib/types";
import { buildDailyPlan, moodHint, moodLabel, pickProjectOfTheDay } from "@/lib/plan";
import { WidgetCard } from "./WidgetCard";
import { useI18n } from "@/lib/i18n";

type Props = {
  projects: Project[];
  mood: Mood;
  onMoodChange: (mood: Mood) => void;
  onToggleTask: (projectId: string, taskId: string) => void;
};

export function DailyPlan({ projects, mood, onMoodChange, onToggleTask }: Props) {
  const { t } = useI18n();
  const plan = useMemo(() => buildDailyPlan(projects, mood), [projects, mood]);
  const featured = useMemo(() => pickProjectOfTheDay(projects), [projects]);

  const diffBadge = (difficulty: 1 | 2 | 3) => {
    switch (difficulty) {
      case 1:
        return { label: t("task.easy"), bg: "#bbf7d0", text: "#14532d" };
      case 3:
        return { label: t("task.hard"), bg: "#fecaca", text: "#7f1d1d" };
      default:
        return { label: t("task.medium"), bg: "#fef08a", text: "#713f12" };
    }
  };

  const toolbar = (
    <div className="flex gap-1">
      {(["high", "normal", "low"] as Mood[]).map((m) => (
        <button
          key={m}
          onClick={() => onMoodChange(m)}
          className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
            mood === m
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          }`}
          title={moodLabel(m)}
        >
          {moodLabel(m).split(" ")[0]}
        </button>
      ))}
    </div>
  );

  const summary = featured ? (
    <div className="rounded p-2 border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
      <div className="text-[10px] uppercase tracking-wide opacity-70">⭐ Your pick today</div>
      <div className="text-base font-bold mt-0.5 truncate">
        {featured.project.paid && "💰 "}
        {featured.project.name}
      </div>
      <div className="text-[11px] opacity-70 truncate">{featured.reason}</div>
    </div>
  ) : (
    <p className="text-xs opacity-60">Create a project to see recommendations.</p>
  );

  const detail =
    plan.length === 0 ? (
      <p className="text-xs opacity-60">{t("dashboard.noTasksToday")}</p>
    ) : (
      <>
        <p className="text-[11px] opacity-70 italic mb-1.5">{moodHint(mood)}</p>
        <ol className="space-y-1">
          {plan.map((item, i) => {
            const badge = diffBadge(item.difficulty);
            return (
              <li
                key={item.taskId}
                className="flex items-start gap-1.5 text-xs border-l-2 border-zinc-200 dark:border-zinc-700 pl-1.5 py-0.5"
              >
                <span className="opacity-50 font-mono w-4 pt-0.5">{i + 1}.</span>
                <input
                  type="checkbox"
                  className="mt-0.5"
                  onChange={() => onToggleTask(item.projectId, item.taskId)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span
                      className="text-[9px] px-1 py-0.5 rounded font-medium"
                      style={{ background: badge.bg, color: badge.text }}
                    >
                      {badge.label}
                    </span>
                    <span className="truncate">{item.taskText}</span>
                  </div>
                  <div className="text-[10px] opacity-60 truncate">
                    {item.paid && "💰 "}
                    {item.projectName}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </>
    );

  return (
    <WidgetCard
      title="Daily Plan"
      toolbar={toolbar}
      summary={summary}
      detail={detail}
    />
  );
}