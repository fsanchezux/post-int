"use client";

import { useEffect, useState } from "react";
import type { Project, ProjectLink, Task } from "@/lib/types";
import { uid } from "@/lib/storage";
import { classifyTask, tagToDifficulty } from "@/lib/classifyTask";
import { POSTIT_PALETTE, pickRandomColor, type PostItColor } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (p: Project) => void;
  initial?: Project;
};

type LinkRow = { url: string; label: string };

const EMPTY_LINKS: LinkRow[] = [
  { url: "", label: "" },
  { url: "", label: "" },
  { url: "", label: "" },
];

function migrateLinks(p: Project): LinkRow[] {
  let arr: LinkRow[] = [];
  if (p.links?.length) {
    arr = p.links.map((l) => {
      if (typeof l === "string") return { url: l, label: "" };
      return { url: l.url ?? "", label: l.label ?? "" };
    });
  } else if (p.link) {
    arr = [{ url: p.link, label: "" }];
  }
  while (arr.length < 3) arr.push({ url: "", label: "" });
  return arr.slice(0, 3);
}

export function CreatePostItModal({ open, onClose, onSave, initial }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(true);
  const [importance, setImportance] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [paid, setPaid] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tasksText, setTasksText] = useState("");
  const [existingTasks, setExistingTasks] = useState<Task[]>([]);
  const [estimatedHours, setEstimatedHours] = useState<string>("");
  const [links, setLinks] = useState<LinkRow[]>(EMPTY_LINKS);
  const [showProgress, setShowProgress] = useState(true);
  const [color, setColor] = useState<PostItColor>(POSTIT_PALETTE[0]);
  const [tagging, setTagging] = useState(false);

  useEffect(() => {
    if (open && initial) {
      setName(initial.name);
      setDescription(initial.description ?? "");
      setShowDescription(initial.showDescription ?? true);
      setImportance(initial.importance);
      setPaid(initial.paid);
      setAmount(initial.amount?.toString() ?? "");
      setStartDate(initial.startDate ?? "");
      setEndDate(initial.endDate ?? "");
      setEstimatedHours(initial.estimatedHours?.toString() ?? "");
      setLinks(migrateLinks(initial));
      setShowProgress(initial.showProgress ?? true);
      const initColor = (initial.color as PostItColor) ?? pickRandomColor();
      setColor(
        POSTIT_PALETTE.includes(initColor as PostItColor)
          ? (initColor as PostItColor)
          : POSTIT_PALETTE[0]
      );
      setExistingTasks(initial.tasks.map((t) => ({ ...t })));
      setTasksText("");
    } else if (open) {
      const today = new Date();
      const inAWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const iso = (d: Date) => d.toISOString().slice(0, 10);
      setName("");
      setDescription("");
      setShowDescription(true);
      setImportance(3);
      setPaid(false);
      setAmount("");
      setStartDate(iso(today));
      setEndDate(iso(inAWeek));
      setEstimatedHours("");
      setLinks(EMPTY_LINKS);
      setShowProgress(true);
      setColor(pickRandomColor());
      setExistingTasks([]);
      setTasksText("");
    }
  }, [open, initial]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const rawTexts = tasksText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    setTagging(true);

    const newTasks: Task[] = await Promise.all(
      rawTexts.map(async (text): Promise<Task> => {
        try {
          const { tag, source } = await classifyTask(text);
          return {
            id: uid(),
            text,
            done: false,
            difficulty: tagToDifficulty(tag),
            autoTag: tag,
            autoTagSource: source,
          };
        } catch {
          return { id: uid(), text, done: false, difficulty: 2 };
        }
      })
    );

    setTagging(false);

    const base: Project = initial ?? {
      id: uid(),
      name: "",
      importance: 3,
      paid: false,
      tasks: [],
      position: {
        x: 80 + Math.random() * 200,
        y: 120 + Math.random() * 120,
      },
      createdAt: new Date().toISOString(),
      color,
    };

    const cleanLinks: ProjectLink[] = links
      .map((l) => ({ url: l.url.trim(), label: l.label.trim() }))
      .filter((l) => l.url)
      .slice(0, 3)
      .map((l) => (l.label ? l : { url: l.url }));

    const project: Project = {
      ...base,
      name: name.trim(),
      description: description.trim() || undefined,
      showDescription,
      importance,
      paid,
      amount: paid && amount ? Number(amount) : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      links: cleanLinks.length > 0 ? cleanLinks : undefined,
      link: undefined,
      showProgress,
      color,
      tasks: initial
        ? [...existingTasks.filter((t) => t.text.trim()), ...newTasks]
        : newTasks,
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
    };

    onSave(project);
    onClose();
  };

  const importanceLabels: Record<number, string> = {
    1: t("project.importanceLow"),
    2: t("project.importanceMedium"),
    3: t("project.importanceHigh"),
    4: t("project.importanceVeryHigh"),
    5: t("project.importanceUrgent"),
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white text-zinc-900 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-auto shadow-2xl"
      >
        <h2 className="text-lg font-semibold mb-4">
          {initial ? t("project.update") : t("project.create")}
        </h2>

        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium">{t("project.name")}</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
            />
          </label>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("project.description")}</span>
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={showDescription}
                  onChange={(e) => setShowDescription(e.target.checked)}
                />
                Show on posit
              </label>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Notes, context, brief..."
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent text-sm"
            />
          </div>

          <div>
            <span className="text-sm font-medium">{t("project.color")}</span>
            <div className="mt-1 flex gap-2">
              {POSTIT_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className="w-8 h-8 rounded-full transition-transform"
                  style={{
                    background: c,
                    outline: color === c ? "2px solid #111" : "1px solid rgba(0,0,0,0.1)",
                    outlineOffset: 2,
                    transform: color === c ? "scale(1.05)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-medium">{t("project.link")} (max 3)</span>
            <div className="mt-1 space-y-1.5">
              {links.map((row, i) => (
                <div key={i} className="grid grid-cols-[110px_1fr] gap-1.5">
                  <input
                    value={row.label}
                    onChange={(e) =>
                      setLinks((prev) =>
                        prev.map((v, idx) =>
                          idx === i ? { ...v, label: e.target.value } : v
                        )
                      )
                    }
                    placeholder="Name"
                    className="border rounded px-2 py-1.5 bg-transparent text-sm"
                  />
                  <input
                    type="url"
                    value={row.url}
                    onChange={(e) =>
                      setLinks((prev) =>
                        prev.map((v, idx) =>
                          idx === i ? { ...v, url: e.target.value } : v
                        )
                      )
                    }
                    placeholder={`https://... (${i + 1})`}
                    className="border rounded px-2 py-1.5 bg-transparent text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium">{t("project.importance")}: {importanceLabels[importance]}</span>
            <input
              type="range"
              min={1}
              max={5}
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              className="w-full"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
            />
            <span className="text-sm font-medium">{t("project.paid")}</span>
          </label>

          {paid && (
            <label className="block">
              <span className="text-sm font-medium">{t("project.amount")} (€)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-sm font-medium">{t("project.startDate")}</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">{t("project.endDate")}</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
              />
            </label>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showProgress}
              onChange={(e) => setShowProgress(e.target.checked)}
            />
            <span className="text-sm font-medium">{t("project.progress")}</span>
          </label>

          <label className="block">
            <span className="text-sm font-medium">{t("project.estimatedHours")}</span>
            <input
              type="number"
              min={0}
              step="0.5"
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent"
            />
          </label>

          {initial && existingTasks.length > 0 && (
            <div>
              <span className="text-sm font-medium">{t("project.tasks")}</span>
              <ul className="mt-1 space-y-1.5">
                {existingTasks.map((task, i) => (
                  <li key={task.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={(e) =>
                        setExistingTasks((prev) =>
                          prev.map((x, idx) =>
                            idx === i
                              ? {
                                  ...x,
                                  done: e.target.checked,
                                  doneAt: e.target.checked
                                    ? new Date().toISOString()
                                    : undefined,
                                }
                              : x
                          )
                        )
                      }
                    />
                    <input
                      value={task.text}
                      onChange={(e) =>
                        setExistingTasks((prev) =>
                          prev.map((x, idx) =>
                            idx === i ? { ...x, text: e.target.value } : x
                          )
                        )
                      }
                      className={`flex-1 border rounded px-2 py-1 bg-transparent text-sm ${
                        task.done ? "line-through opacity-60" : ""
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setExistingTasks((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="text-xs text-red-600 px-1"
                      aria-label={t("project.delete")}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className="block">
            <span className="text-sm font-medium">
              {initial ? "Add new tasks" : t("project.tasks")} (one per line)
            </span>
            <textarea
              value={tasksText}
              onChange={(e) => setTasksText(e.target.value)}
              rows={3}
              placeholder={"Design mockups\nDevelop API\nTesting"}
              className="mt-1 w-full border rounded px-3 py-2 bg-transparent font-mono text-sm"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded border">
            {t("project.cancel")}
          </button>
          <button
            type="submit"
            disabled={tagging}
            className="px-4 py-2 rounded bg-zinc-900 text-white disabled:opacity-60"
          >
            {tagging ? "Tagging..." : initial ? t("common.save") : t("project.create")}
          </button>
        </div>
      </form>
    </div>
  );
}