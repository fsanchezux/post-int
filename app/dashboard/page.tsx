"use client";

import { useEffect, useState } from "react";
import { useMood, useProjects } from "@/lib/storage";
import { WidgetGrid, type WidgetDef } from "@/components/WidgetGrid";
import { TodayPanel } from "@/components/TodayPanel";
import { DailyPlan } from "@/components/DailyPlan";
import { TextStatWidget } from "@/components/TextStatWidget";
import { UsageChartWidget } from "@/components/UsageChartWidget";
import { RestReminderWidget } from "@/components/RestReminderWidget";
import { OutsideHoursWidget } from "@/components/OutsideHoursWidget";
import {
  dailyStreak,
  moneyEarnedLastMonth,
  tasksCompletedLastMonthDetailed,
} from "@/lib/stats";
import {
  moneyLastMonthPhrase,
  tasksLastMonthPhrase,
} from "@/lib/phrases";
import { recentOutsideHours } from "@/lib/outsideHours";
import { useI18n } from "@/lib/i18n";

export default function DashboardPage() {
  const { projects, history, hydrated, updateProject } = useProjects();
  const { mood, setMood } = useMood();
  const { t, language } = useI18n();
  const [showOutside, setShowOutside] = useState(false);

  useEffect(() => {
    setShowOutside(recentOutsideHours().length > 0);
  }, []);

  if (!hydrated) return null;

  const tasksDetail = tasksCompletedLastMonthDetailed(projects, history);
  const moneyEarned = moneyEarnedLastMonth(history);
  const streak = dailyStreak(projects, history);

  const tasksText = tasksLastMonthPhrase(tasksDetail, language);
  const moneyText = moneyLastMonthPhrase(moneyEarned, language);

  const toggleTaskFromPlan = (projectId: string, taskId: string) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    const tasks = p.tasks.map((task) => {
      if (task.id !== taskId) return task;
      const done = !task.done;
      return { ...task, done, doneAt: done ? new Date().toISOString() : undefined };
    });
    updateProject(projectId, { tasks });
  };

  const widgets: WidgetDef[] = [
    {
      id: "stat-tasks",
      defaultPos: { x: 0, y: 0, w: 6, h: 2 },
      minW: 3,
      minH: 2,
      content: (
        <TextStatWidget
          label={t("dashboard.completedTasks")}
          text={tasksText}
          background="var(--postit-green)"
          emoji="✅"
        />
      ),
    },
    {
      id: "stat-money",
      defaultPos: { x: 6, y: 0, w: 6, h: 2 },
      minW: 3,
      minH: 2,
      content: (
        <TextStatWidget
          label="€"
          text={moneyText}
          background="var(--postit-blue)"
          emoji="💰"
        />
      ),
    },
    {
      id: "rest-reminder",
      defaultPos: { x: 0, y: 2, w: 6, h: 2 },
      minW: 3,
      minH: 2,
      content: <RestReminderWidget streak={streak} />,
    },
    {
      id: "usage-chart",
      defaultPos: { x: 6, y: 2, w: 6, h: 2 },
      minW: 3,
      minH: 2,
      content: <UsageChartWidget />,
    },
    ...(showOutside
      ? [
          {
            id: "outside-hours",
            defaultPos: { x: 0, y: 4, w: 6, h: 2 },
            minW: 3,
            minH: 2,
            content: <OutsideHoursWidget />,
          },
        ]
      : []),
    {
      id: "today",
      defaultPos: { x: 0, y: showOutside ? 6 : 4, w: 6, h: 4 },
      minW: 3,
      minH: 3,
      content: <TodayPanel />,
    },
    {
      id: "plan",
      defaultPos: { x: 6, y: showOutside ? 6 : 4, w: 6, h: 4 },
      minW: 3,
      minH: 3,
      content: (
        <DailyPlan
          projects={projects}
          mood={mood}
          onMoodChange={setMood}
          onToggleTask={toggleTaskFromPlan}
        />
      ),
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-6 pb-12">
      <h1 className="sr-only">{t("dashboard.title")}</h1>
      <WidgetGrid widgets={widgets} layoutKey="pmw:dashboard-layout-v2" />
    </main>
  );
}
