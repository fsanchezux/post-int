"use client";

import { useProjects } from "@/lib/storage";
import { progress } from "@/lib/colors";
import { useConfirm } from "@/components/ConfirmDialog";
import { useI18n } from "@/lib/i18n";

export default function HistoryPage() {
  const { history, restoreFromHistory, clearHistoryEntry, hydrated } = useProjects();
  const confirm = useConfirm();
  const { t, language } = useI18n();

  if (!hydrated) return null;

  const locale = language === "ca" ? "ca-ES" : language === "es" ? "es-ES" : "en-US";

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">{t("history.title")}</h1>

      {history.length === 0 ? (
        <p className="opacity-60">{t("history.noHistory")}</p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {history.map((p) => (
            <li
              key={p.id}
              className="border rounded-lg p-4 bg-white/70 dark:bg-zinc-900/70"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">
                    {p.paid && "💰 "}
                    {p.name}
                  </h3>
                  <p className="text-xs opacity-70">
                    {t("project.complete")}:{" "}
                    {p.completedAt
                      ? new Date(p.completedAt).toLocaleDateString(locale)
                      : "—"}
                  </p>
                </div>
                {p.paid && p.amount && (
                  <span className="font-bold text-emerald-600">
                    {p.amount.toLocaleString(locale, {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </span>
                )}
              </div>

              <p className="mt-2 text-xs">
                {p.tasks.filter((t) => t.done).length}/{p.tasks.length} {t("project.tasks").toLowerCase()} ·{" "}
                {progress(p)}%
              </p>

              <div className="mt-3 flex gap-2 text-xs">
                <button
                  onClick={() => restoreFromHistory(p.id)}
                  className="px-3 py-1 rounded border"
                >
                  {t("history.restore")}
                </button>
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: t("project.delete"),
                      message: (
                        <>
                          {t("common.confirm")} <strong>{p.name}</strong>?
                        </>
                      ),
                      confirmLabel: t("project.delete"),
                      destructive: true,
                    });
                    if (ok) clearHistoryEntry(p.id);
                  }}
                  className="px-3 py-1 rounded border text-red-600"
                >
                  {t("project.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}