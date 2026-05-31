"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import type { Project } from "@/lib/types";
import { postItStyle, progress, taskTextStyle } from "@/lib/colors";
import { useSettings } from "@/lib/storage";
import { isWithinWorkHours } from "@/lib/today";
import { recordOutsideHours } from "@/lib/outsideHours";

type Props = {
  project: Project;
  zoom: number;
  selected?: boolean;
  zIndex?: number;
  interactive?: boolean;
  showImageStack?: boolean;
  onSelect?: () => void;
  onUpdate: (id: string, patch: Partial<Project>) => void;
};

const MIN_W = 280;
const MIN_H = 220;
const MAX_W = 800;
const MAX_H = 800;

export function PostIt({
  project,
  zoom,
  selected,
  zIndex,
  interactive = true,
  showImageStack = true,
  onSelect,
  onUpdate,
}: Props) {
  const { settings } = useSettings();
  const ref = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const offset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const dragMoved = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const style = postItStyle(project);
  const pct = progress(project);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const parent = ref.current?.parentElement;
      if (!parent) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
      const parentRect = parent.getBoundingClientRect();
      const newX = Math.max(0, (e.clientX - parentRect.left - offset.current.x) / zoom);
      const newY = Math.max(0, (e.clientY - parentRect.top - offset.current.y) / zoom);
      onUpdate(project.id, { position: { x: newX, y: newY } });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, project.id, onUpdate, zoom]);

  useEffect(() => {
    if (!dragging) return;
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const parent = ref.current?.parentElement;
      if (!parent) return;
      const dx = touch.clientX - dragStart.current.x;
      const dy = touch.clientY - dragStart.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
      const parentRect = parent.getBoundingClientRect();
      const newX = Math.max(0, (touch.clientX - parentRect.left - offset.current.x) / zoom);
      const newY = Math.max(0, (touch.clientY - parentRect.top - offset.current.y) / zoom);
      onUpdate(project.id, { position: { x: newX, y: newY } });
    };
    const onTouchEnd = () => setDragging(false);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [dragging, project.id, onUpdate, zoom]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizeStart.current.x) / zoom;
      const dy = (e.clientY - resizeStart.current.y) / zoom;
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
  }, [resizing, project.id, onUpdate, zoom]);

  useEffect(() => {
    if (!ref.current) return;
    if (dragging) {
      animate(ref.current, {
        scale: 1.04,
        rotate: 1.2,
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
    if (!interactive) return;
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    if (!ref.current) return;
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragStart.current = { x: e.clientX, y: e.clientY };
    dragMoved.current = false;
    setDragging(true);
  };

  const startTouchDrag = (e: React.TouchEvent) => {
    if (!interactive) return;
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    if (!ref.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const rect = ref.current.getBoundingClientRect();
    offset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    dragStart.current = { x: touch.clientX, y: touch.clientY };
    dragMoved.current = false;
    setDragging(true);
  };

  const startResize = (e: React.MouseEvent) => {
    if (!interactive) return;
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

  const handleClick = () => {
    if (dragMoved.current) {
      dragMoved.current = false;
      return;
    }
    onSelect?.();
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

  const width = project.width ?? 384;
  const height = project.height;
  const showProgress = project.showProgress ?? true;
  const showDescription = project.showDescription ?? true;
  const imageStack = showImageStack ? (project.images ?? []).slice(0, 2) : [];
  const stackHeight = height ?? 260;

  return (
    <>
      {imageStack.map((img, i) => {
        const baseOffX = (i + 1) * 18;
        const baseOffY = (i + 1) * 10;
        const baseRot = (i % 2 === 0 ? 1 : -1) * (3 + i * 2);
        const peekX = hovered ? (i + 1) * 30 : 0;
        const peekY = hovered ? (i + 1) * 14 : 0;
        const hoverRot = hovered ? (i % 2 === 0 ? 1 : -1) * (4 + i * 2) : 0;
        return (
          <div
            key={img.id}
            style={{
              left: project.position.x + baseOffX,
              top: project.position.y + baseOffY,
              width,
              height: stackHeight,
              backgroundImage: `url(${img.src})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: "#222",
              transform: `translate(${peekX}px, ${peekY}px) rotate(${baseRot + hoverRot}deg)`,
              transformOrigin: "center center",
              transition:
                "transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 320ms ease",
              zIndex: (zIndex ?? 0) - 1 - i,
              borderRadius: 18,
              boxShadow: hovered
                ? "0 14px 30px rgba(0,0,0,.28)"
                : "0 8px 22px rgba(0,0,0,.22)",
              willChange: "transform",
            }}
            className="absolute pointer-events-none"
            aria-hidden="true"
          />
        );
      })}
      <div
      ref={ref}
      onMouseDown={startDrag}
      onTouchStart={startTouchDrag}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        left: project.position.x,
        top: project.position.y,
        width,
        height: height ?? "auto",
        background: style.bg,
        color: style.text,
        cursor: interactive ? (dragging ? "grabbing" : "grab") : "default",
        zIndex: zIndex ?? 0,
        borderRadius: 18,
        boxShadow: dragging
          ? "0 18px 36px rgba(0,0,0,.28)"
          : selected
          ? "0 0 0 3px #ffea73, 0 8px 22px rgba(0,0,0,.18)"
          : "0 6px 18px rgba(0,0,0,.14)",
      }}
      className="absolute select-none p-6 flex flex-col"
    >
      <div className="font-black leading-[1.05] tracking-tight text-[28px] break-words">
        {project.paid && <span className="mr-1" aria-label="paid">💰</span>}
        {project.name}
      </div>

      {project.description && showDescription && (
        <p
          data-no-drag
          className="mt-3 text-[15px] leading-snug whitespace-pre-wrap"
          style={{ color: "#1c1c1c", opacity: 0.72, fontWeight: 500 }}
        >
          {project.description}
        </p>
      )}

      <div data-no-drag className="mt-5 flex-1 min-h-0">
        {project.tasks.length > 0 ? (
          <ul className="space-y-3 overflow-auto max-h-full">
            {project.tasks.map((task) => {
              const ts = taskTextStyle(task.autoTag, task.done);
              return (
                <li key={task.id} className="flex items-center gap-3 text-[14px]">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    className="w-4 h-4 shrink-0 rounded-sm"
                    style={{ accentColor: "#1c1c1c", opacity: 0.45 }}
                  />
                  <span className={`flex-1 ${ts.className}`} style={ts.style}>
                    {task.text}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {showProgress && (
        <div className="mt-5 flex flex-col items-center gap-1">
          <span
            className="text-[11px] font-mono"
            style={{ color: "#1c1c1c", opacity: 0.55 }}
          >
            {pct}%
          </span>
          <div
            className="w-full h-[3px] rounded-full overflow-hidden"
            style={{ background: "rgba(0,0,0,.18)" }}
          >
            <div
              className="h-full"
              style={{ width: `${pct}%`, background: "#1c1c1c" }}
            />
          </div>
        </div>
      )}

      {project.shareId && (
        <span
          className="absolute top-3 right-4 text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded"
          style={{ background: "#111", color: "#fff" }}
          title="Publicly shared"
        >
          live
        </span>
      )}

      {interactive && (
        <div
          data-no-drag
          onMouseDown={startResize}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-30"
          title="Resize"
        />
      )}
      </div>
    </>
  );
}
