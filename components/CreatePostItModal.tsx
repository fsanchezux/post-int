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

type SectionId = "basics" | "tasks" | "links" | "details" | "style";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "tasks", label: "Tasks" },
  { id: "links", label: "Links" },
  { id: "details", label: "Details" },
  { id: "style", label: "Style" },
];

const IMPORTANCE_SIZE: Record<1 | 2 | 3 | 4 | 5, { width: number; height: number }> = {
  1: { width: 300, height: 220 },
  2: { width: 340, height: 240 },
  3: { width: 384, height: 280 },
  4: { width: 440, height: 320 },
  5: { width: 500, height: 360 },
};

const STEP_COLORS: string[] = [
  "#9ca3af", // 1 — gray
  "#f6c343", // 2 — amber/yellow
  "#9bccd0", // 3 — light cyan/blue
  "#1f4381", // 4 — navy
  "#b1d8bb", // 5 — sage green
];

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
  const [titleWeight, setTitleWeight] = useState<"semibold" | "bold" | "extrabold">("extrabold");
  const [textColor, setTextColor] = useState<"auto" | "dark" | "light">("auto");
  const [shape, setShape] = useState<"auto" | "normal" | "spiral" | "clip" | "folder">("auto");
  const [color, setColor] = useState<PostItColor>(POSTIT_PALETTE[0]);
  const [tagging, setTagging] = useState(false);
  const [section, setSection] = useState<SectionId>("basics");

  const isEdit = !!initial;

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
      setTitleWeight(initial.titleWeight ?? "extrabold");
      setTextColor(initial.textColor ?? "auto");
      setShape(initial.shape ?? "auto");
      const initColor = (initial.color as PostItColor) ?? pickRandomColor();
      setColor(
        POSTIT_PALETTE.includes(initColor as PostItColor)
          ? (initColor as PostItColor)
          : POSTIT_PALETTE[0]
      );
      setExistingTasks(initial.tasks.map((t) => ({ ...t })));
      setTasksText("");
      setSection("basics");
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
      setTitleWeight("extrabold");
      setTextColor("auto");
      setShape("auto");
      setColor(pickRandomColor());
      setExistingTasks([]);
      setTasksText("");
      setSection("basics");
    }
  }, [open, initial]);

  useEffect(() => {
    const onSaveEvt = () => {
      if (open && name.trim()) {
        const form = document.querySelector("form[data-posit-form]") as HTMLFormElement | null;
        if (form) form.requestSubmit();
      }
    };
    window.addEventListener("shortcut:save-task", onSaveEvt);
    return () => window.removeEventListener("shortcut:save-task", onSaveEvt);
  }, [open, name]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSection("basics");
      return;
    }

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

    const size = IMPORTANCE_SIZE[importance];
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
      titleWeight,
      textColor,
      shape,
      color,
      width: size.width,
      height: size.height,
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

  const sectionIdx = SECTIONS.findIndex((s) => s.id === section);
  const goPrev = () => {
    if (sectionIdx > 0) setSection(SECTIONS[sectionIdx - 1].id);
  };
  const goNext = () => {
    if (sectionIdx < SECTIONS.length - 1) setSection(SECTIONS[sectionIdx + 1].id);
  };
  const isLast = sectionIdx === SECTIONS.length - 1;

  const inputClass =
    "mt-1 w-full rounded px-3 py-2 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300";
  const inputStyle = { border: "1px solid var(--border)", color: "var(--ink)" } as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={onClose}
    >
      <form
        data-posit-form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="relative rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-auto shadow-2xl"
        style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--border)" }}
      >
        <div
          className="absolute top-4 right-4 grid grid-cols-2 gap-[3px] pointer-events-none"
          aria-hidden="true"
          title="Drag"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className="block rounded-full"
              style={{ width: 4, height: 4, background: "var(--muted)" }}
            />
          ))}
        </div>

        <h2 className="text-lg font-semibold mb-3 pr-10">
          {isEdit ? t("project.update") : t("project.create")}
        </h2>

        {/* Tabs (edit) / progress dots (create) */}
        {isEdit ? (
          <div
            className="flex gap-1 mb-4 -mx-1 overflow-x-auto"
            role="tablist"
            aria-label="Sections"
          >
            {SECTIONS.map((s) => {
              const active = s.id === section;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSection(s.id)}
                  className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors"
                  style={{
                    background: active ? "var(--surface-2)" : "transparent",
                    color: active ? "var(--ink)" : "var(--muted)",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mb-4">
            {SECTIONS.map((s, i) => (
              <div
                key={s.id}
                className="h-1 flex-1 rounded-full transition-colors"
                style={{
                  background: i <= sectionIdx ? STEP_COLORS[sectionIdx] : "var(--surface-2)",
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        )}

        {!isEdit && (
          <div
            className="text-xs uppercase tracking-widest mb-3"
            style={{ color: "var(--muted)" }}
          >
            Step {sectionIdx + 1} of {SECTIONS.length} — {SECTIONS[sectionIdx].label}
          </div>
        )}

        <div className="space-y-3">
          {section === "basics" && (
            <>
              <label className="block">
                <span className="text-sm font-medium">{t("project.name")}</span>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClass}
                  style={inputStyle}
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
                  className={inputClass}
                  style={inputStyle}
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
                        outline: color === c ? "2px solid var(--ink)" : "1px solid var(--border)",
                        outlineOffset: 2,
                        transform: color === c ? "scale(1.05)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {section === "tasks" && (
            <>
              {isEdit && existingTasks.length > 0 && (
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
                          className={`flex-1 rounded px-2 py-1 bg-transparent text-sm ${
                            task.done ? "line-through opacity-60" : ""
                          }`}
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setExistingTasks((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="text-xs text-red-500 px-1"
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
                  {isEdit ? "Add new tasks" : t("project.tasks")} (one per line)
                </span>
                <textarea
                  value={tasksText}
                  onChange={(e) => setTasksText(e.target.value)}
                  rows={5}
                  placeholder={"Design mockups\nDevelop API\nTesting"}
                  className={`${inputClass} font-mono`}
                  style={inputStyle}
                />
              </label>
            </>
          )}

          {section === "links" && (
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
                      className="rounded px-2 py-1.5 bg-transparent text-sm"
                      style={inputStyle}
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
                      className="rounded px-2 py-1.5 bg-transparent text-sm"
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "details" && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium">
                  {t("project.importance")}: {importanceLabels[importance]}
                </span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={importance}
                  onChange={(e) => setImportance(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="w-full"
                  style={{ accentColor: "#1f4381" }}
                />
              </label>

              <div
                className="rounded-md p-3 text-xs"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--muted)",
                  border: "1px solid var(--border)",
                }}
              >
                More importance = bigger card on the board ({IMPORTANCE_SIZE[importance].width}
                ×{IMPORTANCE_SIZE[importance].height} px).
              </div>
            </div>
          )}

          {section === "style" && (
            <>
              <div>
                <span className="text-sm font-medium">Text color</span>
                <div
                  className="mt-1 inline-flex rounded-md overflow-hidden"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {([
                    { value: "auto", label: "Auto" },
                    { value: "dark", label: "Dark" },
                    { value: "light", label: "Light" },
                  ] as const).map((opt) => {
                    const active = textColor === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setTextColor(opt.value)}
                        className="px-3 py-1.5 text-sm uppercase tracking-tight transition-colors"
                        style={{
                          background: active ? "var(--ink)" : "transparent",
                          color: active ? "var(--surface)" : "var(--ink)",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium">Shape</span>
                <div
                  className="mt-1 inline-flex rounded-md overflow-hidden flex-wrap"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {([
                    { value: "auto", label: "Auto" },
                    { value: "normal", label: "Normal" },
                    { value: "clip", label: "Clip" },
                    { value: "spiral", label: "Spiral" },
                    { value: "folder", label: "Folder" },
                  ] as const).map((opt) => {
                    const active = shape === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setShape(opt.value)}
                        className="px-3 py-1.5 text-sm uppercase tracking-tight transition-colors"
                        style={{
                          background: active ? "var(--ink)" : "transparent",
                          color: active ? "var(--surface)" : "var(--ink)",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-sm font-medium">Title weight</span>
                <div
                  className="mt-1 inline-flex rounded-md overflow-hidden"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {([
                    { value: "semibold", label: "Semi", weight: 600 },
                    { value: "bold", label: "Bold", weight: 700 },
                    { value: "extrabold", label: "Extra", weight: 800 },
                  ] as const).map((opt) => {
                    const active = titleWeight === opt.value;
                    return (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setTitleWeight(opt.value)}
                        className="px-3 py-1.5 text-sm uppercase tracking-tight transition-colors"
                        style={{
                          fontWeight: opt.weight,
                          background: active ? "var(--ink)" : "transparent",
                          color: active ? "var(--surface)" : "var(--ink)",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showProgress}
                  onChange={(e) => setShowProgress(e.target.checked)}
                />
                <span className="text-sm font-medium">{t("project.progress")}</span>
              </label>
            </>
          )}
        </div>

        <div className="flex justify-between items-center gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-sm font-medium transition-colors hover:opacity-80"
            style={{ border: "1px solid var(--border)", color: "var(--ink)" }}
          >
            {t("project.cancel")}
          </button>

          <div className="flex items-center gap-2">
            {!isEdit && sectionIdx > 0 && (
              <button
                type="button"
                onClick={goPrev}
                className="px-4 py-2 rounded text-sm font-medium transition-colors hover:opacity-80"
                style={{ border: "1px solid var(--border)", color: "var(--ink)" }}
              >
                Back
              </button>
            )}
            {!isEdit && !isLast ? (
              <button
                type="button"
                onClick={goNext}
                disabled={sectionIdx === 0 && !name.trim()}
                className="px-4 py-2 rounded text-sm font-medium text-white transition-colors disabled:opacity-50 hover:opacity-90"
                style={{ background: "#9ca3af" }}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={tagging}
                className="px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-60 hover:opacity-90 transition-colors"
                style={{ background: "#9ca3af" }}
              >
                {tagging ? "Tagging..." : isEdit ? t("common.save") : t("project.create")}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
