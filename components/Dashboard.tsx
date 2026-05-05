"use client";

import type { Project } from "@/lib/types";
import { postItStyle, progress } from "@/lib/colors";
import { WidgetCard } from "./WidgetCard";

type Props = {
  projects: Project[];
};

export function Dashboard({ projects }: Props) {
  const totalEarnings = projects
    .filter((p) => p.paid && p.amount)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + progress(p), 0) / projects.length)
    : 0;

  const summary = (
    <div className="flex items-baseline gap-3 flex-wrap text-sm">
      <span className="font-semibold">{projects.length} activos</span>
      <span className="opacity-70">media {avgProgress}%</span>
      {totalEarnings > 0 && (
        <span className="font-semibold text-emerald-600">
          {totalEarnings.toLocaleString("es-ES", {
            style: "currency",
            currency: "EUR",
          })}
        </span>
      )}
    </div>
  );

  const detail =
    projects.length === 0 ? (
      <p className="text-xs opacity-60">Sin proyectos activos.</p>
    ) : (
      <ul className="space-y-1.5">
        {projects.map((p) => {
          const pct = progress(p);
          const style = postItStyle(p);
          return (
            <li key={p.id} className="text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {p.paid && "💰 "}
                  {p.name}
                </span>
                <span className="font-mono opacity-70">{pct}%</span>
              </div>
              <div
                className="mt-0.5 h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(0,0,0,.08)" }}
              >
                <div
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, background: style.border }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    );

  return <WidgetCard title="Dashboard" summary={summary} detail={detail} />;
}
