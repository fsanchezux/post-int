"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import type { DifficultyTag, Project } from "@/lib/types";
import { postItStyle, progress } from "@/lib/colors";
import { tagToDifficulty } from "@/lib/classifyTask";
import { uid, useSettings } from "@/lib/storage";
import { isWithinWorkHours } from "@/lib/today";
import { recordOutsideHours } from "@/lib/outsideHours";
import { useConfirm } from "./ConfirmDialog";
import { useI18n } from "@/lib/i18n";

function projectToSharePayload(project: Project) {
  const links = (project.links ?? (project.link ? [{ url: project.link }] : []))
    .map((l) => (typeof l === "string" ? { url: l } : l))
    .filter((l) => l.url);
  return {
    name: project.name,
    description: project.description,
    showDescription: project.showDescription ?? true,
    color: project.color,
    links,
    showProgress: project.showProgress ?? true,
    startDate: project.startDate,
    endDate: project.endDate,
    paid: project.paid,
    amount: project.amount,
    tasks: project.tasks.map((t) => ({
      id: t.id,
      text: t.text,
      done: t.done,
      autoTag: t.autoTag,
    })),
  };
}

const TAG_ORDER: DifficultyTag[] = ["easy", "medium", "hard"];

const TAG_STYLE: Record<DifficultyTag, { bg: string; color: string }> = {
  easy: { bg: "#111111", color: "#ffffff" },
  medium: { bg: "rgba(0,0,0,0.10)", color: "#1c1c1c" },
  hard: { bg: "#ef4444", color: "#ffffff" },
};

function nextTag(current: DifficultyTag | undefined): DifficultyTag {
  const idx = current ? TAG_ORDER.indexOf(current) : -1;
  return TAG_ORDER[(idx + 1) % TAG_ORDER.length];
}

type Props = {
  project: Project;
  onUpdate: (id: string, patch: Partial<Project>) => void;
  onComplete: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (project: Project) => void;
};

const MIN_W = 280;
const MIN_H = 220;
const MAX_W = 800;
const MAX_H = 800;

export function PostIt({ project, onUpdate, onComplete, onRemove, onEdit }: Props) {
  const { t } = useI18n();
  const { settings } = useSettings();
  const ref = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const confirm = useConfirm();

  const style = postItStyle(project);
  const pct = progress(project);
  const earnings = project.paid && project.amount ? project.amount : 0;

  const tagLabel = (tag: DifficultyTag): string => {
    switch (tag) {
      case "easy": return t("task.easy");
      case "hard": return t("task.hard");
      default: return t("task.medium");
    }
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const parent = ref.current?.parentElement;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const newX = Math.max(0, e.clientX - parentRect.left - offset.current.x);
      const newY = Math.max(0, e.clientY - parentRect.top - offset.current.y);
      onUpdate(project.id, { position: { x: newX, y: newY } });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, project.id, onUpdate]);

  useEffect(() => {
    if (!dragging) return;
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const parent = ref.current?.parentElement;
      if (!parent) return;
      const parentRect = parent.getBoundingClientRect();
      const newX = Math.max(0, touch.clientX - parentRect.left - offset.current.x);
      const newY = Math.max(0, touch.clientY - parentRect.top - offset.current.y);
      onUpdate(project.id, { position: { x: newX, y: newY } });
    };
    const onTouchEnd = () => setDragging(false);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging, project.id, onUpdate]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStart.current.x;
      const dy = e.clientY - resizeStart.current.y;
      onUpdate(project.id, {
        width: Math.min(MAX_W, Math.max(MIN_W, resizeStart.current.w + dx)),
        height: Math.min(MAX_H, Math.max(MIN_H, resizeStart.current.h + dy)),
      });
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, project.id, onUpdate]);

  useEffect(() => {
    if (!resizing) return;
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const dx = touch.clientX - resizeStart.current.x;
      const dy = touch.clientY - resizeStart.current.y;
      onUpdate(project.id, {
        width: Math.min(MAX_W, Math.max(MIN_W, resizeStart.current.w + dx)),
        height: Math.min(MAX_H, Math.max(MIN_H, resizeStart.current.h + dy)),
      });
    };
    const onTouchEnd = () => setResizing(false);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [resizing, project.id, onUpdate]);

  useEffect(() => {
    if (!ref.current) return;
    if (dragging) {
      animate(ref.current, {
        scale: 1.06,
        rotate: 1.5,
        duration: 220,
        ease: "outQuad",
      });
    } else {
      animate(ref.current, {
        scale: 1,
        rotate: 0,
        duration: 600,
        ease: "outElastic(1, .55)",
      });
    }
  }, [dragging]);

  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    if (!ref.current) return;
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
  };

  const startTouchDrag = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    if (!ref.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = ref.current.getBoundingClientRect();
    offset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    setDragging(true);
  };

  const startResize = (e: React.MouseEvent) => {
    if (!ref.current) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = ref.current.getBoundingClientRect();
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      w: project.width ?? rect.width,
      h: project.height ?? rect.height,
    };
    setResizing(true);
  };

  const startTouchResize = (e: React.TouchEvent) => {
    if (!ref.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = ref.current.getBoundingClientRect();
    resizeStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      w: project.width ?? rect.width,
      h: project.height ?? rect.height,
    };
    setResizing(true);
  };

  const toggleTask = (taskId: string) => {
    const tasks = project.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const done = !t.done;
      if (done && !isWithinWorkHours(settings)) {
        recordOutsideHours(project.id, taskId);
      }
      return {
        ...t,
        done,
        doneAt: done ? new Date().toISOString() : undefined,
      };
    });
    onUpdate(project.id, { tasks });
  };

  const cycleTaskTag = (taskId: string) => {
    const tasks = project.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const tag = nextTag(t.autoTag);
      return {
        ...t,
        autoTag: tag,
        autoTagSource: "manual" as const,
        difficulty: tagToDifficulty(tag),
      };
    });
    onUpdate(project.id, { tasks });
  };

  const removeTask = (taskId: string) => {
    onUpdate(project.id, { tasks: project.tasks.filter((t) => t.id !== taskId) });
  };

  const [sharing, setSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!project.shareId) return;
    const timeout = setTimeout(() => {
      fetch(`/api/share/${project.shareId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectToSharePayload(project)),
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(timeout);
  }, [project]);

  const startShare = async () => {
    setSharing(true);
    try {
      let id = project.shareId;
      if (!id) {
        id = uid();
        await fetch(`/api/share/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(projectToSharePayload(project)),
        });
        onUpdate(project.id, { shareId: id });
      }
      const url = `${window.location.origin}/share/${id}`;
      try {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      } catch {
        window.prompt("Copy this link:", url);
      }
    } finally {
      setSharing(false);
    }
  };

  const stopShare = async () => {
    if (!project.shareId) return;
    const ok = await confirm({
      title: "Stop sharing",
      message: "Revoke the public link?",
      confirmLabel: "Revoke",
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/share/${project.shareId}`, { method: "DELETE" }).catch(() => {});
    onUpdate(project.id, { shareId: undefined });
  };

  const allDone = project.tasks.length > 0 && project.tasks.every((t) => t.done);
  const width = project.width ?? 384;
  const height = project.height;

  return (
    <div
      ref={ref}
      onMouseDown={startDrag}
      onTouchStart={startTouchDrag}
      style={{
        left: project.position.x,
        top: project.position.y,
        width,
        height: height ?? "auto",
        background: style.bg,
        color: style.text,
        cursor: dragging ? "grabbing" : "grab",
        boxShadow: dragging
          ? "0 18px 36px rgba(0,0,0,.28)"
          : "0 4px 14px rgba(0,0,0,.15)",
      }}
      className="group absolute select-none rounded-lg p-4 flex flex-col"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-base leading-tight flex items-center gap-1 flex-1">
          {project.paid && <span aria-label="paid">💰</span>}
          {project.name}
        </div>
        <div
          data-no-drag
          className="flex gap-1 transition-opacity duration-150 items-center [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
        >
          {project.shareId && (
            <span
              className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "#111", color: "#fff" }}
              title="Publicly shared"
            >
              live
            </span>
          )}
          <button
            onClick={startShare}
            disabled={sharing}
            className="text-sm opacity-70 hover:opacity-100 px-1"
            aria-label={project.shareId ? t("share.copyLink") : "Share"}
            title={
              shareCopied
                ? t("share.linkCopied")
                : project.shareId
                ? t("share.copyLink")
                : "Share publicly"
            }
          >
            {shareCopied ? "✓" : project.shareId ? "🔗" : "↗"}
          </button>
          {project.shareId && (
            <button
              onClick={stopShare}
              className="text-sm opacity-70 hover:opacity-100 px-1"
              aria-label="Stop sharing"
              title="Stop sharing"
            >
              ⛔
            </button>
          )}
          <button
            onClick={() => onEdit(project)}
            className="text-sm opacity-70 hover:opacity-100 px-1"
            aria-label={t("project.update")}
            title={t("project.update")}
          >
            ✎
          </button>
          <button
            onClick={async () => {
              const ok = await confirm({
                title: t("project.delete"),
                message: (
                  <>
                    {t("common.confirm")} <strong>{project.name}</strong>?
                  </>
                ),
                confirmLabel: t("project.delete"),
                destructive: true,
              });
              if (ok) onRemove(project.id);
            }}
            className="text-sm opacity-70 hover:opacity-100 px-1"
            aria-label={t("project.delete")}
            title={t("project.delete")}
          >
            ✕
          </button>
        </div>
      </div>

      {project.paid && earnings > 0 && (
        <div data-no-drag className="mt-1 text-2xl font-bold">
          {earnings.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
        </div>
      )}

      {project.description && (project.showDescription ?? true) && (
        <p
          data-no-drag
          className="mt-1 text-xs leading-snug whitespace-pre-wrap opacity-80"
        >
          {project.description}
        </p>
      )}

      {(() => {
        const raw = project.links ?? (project.link ? [{ url: project.link }] : []);
        const normalized = raw
          .map((l) => (typeof l === "string" ? { url: l, label: undefined } : l))
          .filter((l) => l.url);
        if (normalized.length === 0) return null;
        return (
          <div data-no-drag className="mt-1 flex flex-col gap-0.5">
            {normalized.slice(0, 3).map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline truncate max-w-full"
                style={{ color: style.text }}
                onClick={(e) => e.stopPropagation()}
              >
                🔗 {l.label || l.url.replace(/^https?:\/\//, "").slice(0, 40)}
              </a>
            ))}
          </div>
        );
      })()}

      {(project.showProgress ?? true) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <div
            className="flex-1 h-2 rounded-full overflow-hidden"
            style={{ background: "rgba(0,0,0,.12)" }}
          >
            <div
              className="h-full"
              style={{ width: `${pct}%`, background: style.border }}
            />
          </div>
          <span className="font-mono">{pct}%</span>
        </div>
      )}

      {(project.startDate || project.endDate) && (
        <div className="mt-1 text-[11px] opacity-70">
          {project.startDate ?? "—"} → {project.endDate ?? "—"}
        </div>
      )}

      <div data-no-drag className="mt-3 space-y-2 flex-1 flex flex-col min-h-0">
        {project.tasks.length > 0 ? (
          <ul className="space-y-1 overflow-auto flex-1 min-h-0">
            {project.tasks.map((task) => {
              const tag: DifficultyTag = task.autoTag ?? "medium";
              const s = TAG_STYLE[tag];
              return (
                <li key={task.id} className="flex items-center gap-2 text-sm group/task">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                  />
                  <button
                    onClick={() => cycleTaskTag(task.id)}
                    title="Click to change difficulty"
                    className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded shrink-0 min-w-[58px] text-center transition-colors"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {tagLabel(tag)}
                  </button>
                  <span className={task.done ? "line-through opacity-60 flex-1" : "flex-1"}>
                    {task.text}
                  </span>
                  <button
                    onClick={() => removeTask(task.id)}
                    className="[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/task:opacity-60 hover:!opacity-100 text-xs"
                    aria-label={t("task.delete")}
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs opacity-50 italic">
            {t("task.addTask")} →
          </p>
        )}

        {allDone && (
          <button
            onClick={() => onComplete(project.id)}
            className="w-full text-sm px-3 py-1.5 rounded font-medium text-white"
            style={{ background: style.border }}
          >
            ✓ {t("project.complete")}
          </button>
        )}

        {!allDone && project.tasks.length > 0 && (
          <div className="text-xs opacity-60">
            {project.tasks.filter((t) => t.done).length}/{project.tasks.length} {t("project.tasks").toLowerCase()} ·{" "}
            {t("project.importance").toLowerCase()} {project.importance}/5
          </div>
        )}
      </div>

      <div
        data-no-drag
        onMouseDown={startResize}
        onTouchStart={startTouchResize}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
        title="Resize"
      />
    </div>
  );
}