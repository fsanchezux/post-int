"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import type { Project } from "@/lib/types";
import { postItStyle, progress, taskTextStyle, darken, lighten, isDarkColor, textColorFor } from "@/lib/colors";
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
  const [shareCopied, setShareCopied] = useState(false);
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

  const isSmall = width < 320 || (height ?? 260) < 240;
  const isTiny = width < 260 || (height ?? 260) < 200;
  const textPref = project.textColor ?? "auto";
  const onDark =
    textPref === "light" ? true : textPref === "dark" ? false : isDarkColor(style.bg);
  const textOnBg =
    textPref === "light"
      ? "#ffffff"
      : textPref === "dark"
      ? "#1c1c1c"
      : textColorFor(style.bg);
  const progressTrack = onDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)";
  const progressFill = onDark ? lighten(style.bg, 0.55) : darken(style.bg, 0.35);
  const dragDotColor = onDark ? "rgba(255,255,255,0.6)" : "rgba(28,28,28,0.5)";

  const createdMs = new Date(project.createdAt).getTime();
  const ageDays = Number.isFinite(createdMs)
    ? Math.max(0, Math.floor((Date.now() - createdMs) / 86_400_000))
    : 0;

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.done).length;
  const hasShare = !!project.shareId;
  const hasTaskProgress = totalTasks > 0 && completedTasks > 0;
  const indicatorMode: "share" | "tasks" | "days" = hasShare
    ? "share"
    : hasTaskProgress
    ? "tasks"
    : "days";

  const hasImages = (project.images?.length ?? 0) > 0;
  const shapePref = project.shape ?? "auto";
  const effectiveShape: "normal" | "spiral" | "clip" | "folder" =
    shapePref === "auto"
      ? hasImages
        ? "folder"
        : totalTasks > 0
        ? "spiral"
        : "clip"
      : shapePref;

  const copyShareUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!project.shareId) return;
    const url = `${window.location.origin}/share/${project.shareId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
    }
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1600);
  };

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
        color: textOnBg,
        cursor: interactive ? (dragging ? "grabbing" : "grab") : "default",
        zIndex: zIndex ?? 0,
        borderRadius: effectiveShape === "folder" ? "0 18px 18px 18px" : "18px",
        boxShadow: selected ? "0 0 0 3px #ffea73" : "none",
      }}
      className="absolute select-none p-6 flex flex-col"
    >
      {effectiveShape === "folder" && (() => {
        const tabH = 26;
        const tabW = Math.round(width * 0.5);
        const flare = Math.round(tabH * 1.1);
        const rTL = 14;
        const overlap = 2;
        const totalH = tabH + overlap;
        const totalW = tabW + flare;
        const cx = tabW + flare * 0.35;
        const cy = tabH * 0.15;
        return (
          <svg
            aria-hidden="true"
            width={totalW}
            height={totalH}
            viewBox={`0 0 ${totalW} ${totalH}`}
            style={{
              position: "absolute",
              top: -tabH,
              left: 0,
              display: "block",
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            <path
              d={`M 0 ${totalH} L 0 ${rTL} Q 0 0 ${rTL} 0 L ${tabW} 0 Q ${cx} ${cy} ${totalW} ${tabH} L ${totalW} ${totalH} Z`}
              fill={style.bg}
            />
          </svg>
        );
      })()}

      {effectiveShape === "spiral" && (() => {
        const cardH = height ?? 260;
        const coilCount = Math.max(12, Math.min(28, Math.round(cardH / 13)));
        const margin = 8;
        const usable = cardH - margin * 2;
        const step = usable / (coilCount - 1);
        const loopExtendsLeft = 12;
        const holeInsideCard = 9;
        const cardEdgeX = loopExtendsLeft;
        const holeX = cardEdgeX + holeInsideCard;
        const svgW = loopExtendsLeft + holeInsideCard + 6;
        const clipId = `spiralClip-${project.id}`;
        return (
          <svg
            aria-hidden="true"
            width={svgW}
            height={cardH}
            viewBox={`0 0 ${svgW} ${cardH}`}
            style={{
              position: "absolute",
              top: 0,
              left: -loopExtendsLeft,
              display: "block",
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            <defs>
              {Array.from({ length: coilCount - 1 }).map((_, i) => {
                const cy1 = margin + i * step;
                const cy2 = margin + (i + 1) * step;
                const midY = (cy1 + cy2) / 2;
                return (
                  <clipPath id={`${clipId}-${i}`} key={i}>
                    {/* Allow rendering everywhere LEFT of the card edge, plus only the TOP HALF (above midY) of the card area.
                        Effect: the first half of the arc (top, near hole[i]) sits in front of the card; the second half
                        (bottom, near hole[i+1]) gets clipped at the card edge, looking like it goes behind. */}
                    <polygon
                      points={`-100,-100 100,-100 100,${midY} ${cardEdgeX},${midY} ${cardEdgeX},${cardH + 100} -100,${cardH + 100}`}
                    />
                  </clipPath>
                );
              })}
            </defs>
            {/* Arcs joining hole[i] to hole[i+1] — each arc: first node in FRONT, second node BEHIND */}
            {Array.from({ length: coilCount - 1 }).map((_, i) => {
              const cy1 = margin + i * step;
              const cy2 = margin + (i + 1) * step;
              const d = `
                M ${holeX - 1} ${cy1 + 1}
                C ${1} ${cy1 + step * 0.2},
                  ${1} ${cy2 - step * 0.2},
                  ${holeX - 1} ${cy2 - 1}
              `;
              return (
                <path
                  key={`w${i}`}
                  d={d}
                  fill="none"
                  stroke="#0a0a0a"
                  strokeWidth="3.6"
                  strokeLinecap="round"
                  clipPath={`url(#${clipId}-${i})`}
                />
              );
            })}
            {/* Punched paper holes — on top of the card, not clipped */}
            {Array.from({ length: coilCount }).map((_, i) => {
              const cy = margin + i * step;
              return (
                <g key={`h${i}`}>
                  <ellipse
                    cx={holeX}
                    cy={cy}
                    rx={3.2}
                    ry={2.6}
                    fill="rgba(0,0,0,0.65)"
                  />
                  <ellipse
                    cx={holeX}
                    cy={cy - 0.7}
                    rx={2.5}
                    ry={1.9}
                    fill="rgba(255,255,255,0.08)"
                  />
                </g>
              );
            })}
          </svg>
        );
      })()}

      {effectiveShape === "clip" && (() => {
        const clipW = 36;
        const clipH = 70;
        const offsetX = Math.max(0, width - clipW - 30);
        return (
          <svg
            aria-hidden="true"
            width={clipW}
            height={clipH}
            viewBox="0 0 36 70"
            style={{
              position: "absolute",
              top: -clipH * 0.18,
              left: offsetX,
              display: "block",
              pointerEvents: "none",
              overflow: "visible",
              filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.25))",
            }}
          >
            <path
              d="M 10 8 Q 10 2 18 2 Q 26 2 26 8 L 26 50 Q 26 58 18 58 Q 10 58 10 50 L 10 16 Q 10 10 16 10 Q 22 10 22 16 L 22 46"
              fill="none"
              stroke="#1c1c1c"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        );
      })()}
      <div
        className="tracking-tight break-words pr-10"
        style={{
          fontFamily: '"Delight", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          fontWeight:
            project.titleWeight === "semibold"
              ? 600
              : project.titleWeight === "bold"
              ? 700
              : 800,
          fontSize: isTiny ? 28 : isSmall ? 34 : 40,
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
        }}
      >
        {project.name}
      </div>

      {project.description && showDescription && !isTiny && (
        <p
          data-no-drag
          className="mt-3 text-[15px] leading-snug whitespace-pre-wrap"
          style={{
            color: textOnBg,
            opacity: 0.72,
            fontWeight: 500,
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: isSmall ? 2 : 5,
            overflow: "hidden",
          }}
        >
          {project.description}
        </p>
      )}

      <div data-no-drag className="mt-5 flex-1 min-h-0">
        {project.tasks.length > 0 && !isTiny ? (
          <ul className="space-y-3 overflow-auto max-h-full">
            {project.tasks.map((task) => {
              const ts = taskTextStyle(task.autoTag, task.done, onDark);
              return (
                <li key={task.id} className="flex items-center gap-3 text-[14px]">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    className="w-4 h-4 shrink-0 rounded-sm"
                    style={{ accentColor: textOnBg, opacity: 0.55 }}
                  />
                  <span
                    className={`flex-1 truncate ${ts.className}`}
                    style={ts.style}
                  >
                    {task.text}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      {showProgress && (
        <div className="mt-5 flex items-center gap-3">
          {indicatorMode === "share" ? (
            <button
              data-no-drag
              onClick={copyShareUrl}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full uppercase leading-none cursor-pointer"
              style={{
                height: 34,
                padding: "0 11px",
                background: progressFill,
                color: style.bg,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                fontFamily:
                  '"Delight", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
              }}
              title={shareCopied ? "Link copied!" : "Copy share link"}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: style.bg,
                  opacity: shareCopied ? 0.5 : 1,
                  boxShadow: shareCopied ? "none" : `0 0 0 2.5px ${progressFill}, 0 0 0 4px ${style.bg}33`,
                  animation: shareCopied ? "none" : "postit-live-pulse 1.6s ease-in-out infinite",
                }}
              />
              {shareCopied ? "Copied" : "Live"}
            </button>
          ) : indicatorMode === "tasks" ? (
            <span
              className="shrink-0 inline-flex items-center justify-center rounded-full tabular-nums leading-none"
              style={{
                height: 34,
                padding: "0 12px",
                background: progressFill,
                color: style.bg,
                fontSize: totalTasks < 10 ? 14 : 13,
                fontWeight: 700,
                letterSpacing: "0.02em",
                fontFamily:
                  '"Delight", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
              }}
              title={`${completedTasks} of ${totalTasks} tasks completed`}
            >
              <span style={{ display: "inline-block", transform: "translateY(-0.04em)" }}>
                {completedTasks}/{totalTasks}
              </span>
            </span>
          ) : (
            <svg
              width={34}
              height={34}
              viewBox="0 0 34 34"
              className="shrink-0"
              role="img"
              aria-label={`${ageDays} day${ageDays === 1 ? "" : "s"} since creation`}
            >
              <title>{`${ageDays} day${ageDays === 1 ? "" : "s"} since creation`}</title>
              <circle cx={17} cy={17} r={17} fill={progressFill} />
              <text
                x={17}
                y={17}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily='"Delight", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
                fontWeight={700}
                fontSize={
                  ageDays < 10 ? 22 : ageDays < 100 ? 16 : ageDays < 1000 ? 12 : 10
                }
                fill={style.bg}
              >
                {ageDays}
              </text>
            </svg>
          )}
          <div className="flex-1" />
          <div
            className="h-[16px] rounded-full overflow-hidden"
            style={{ background: progressTrack, width: "45%" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: progressFill,
                transition: "width 320ms ease",
              }}
            />
          </div>
        </div>
      )}

      <div
        className="absolute top-4 right-4 grid grid-cols-2 gap-[3px] pointer-events-none"
        aria-hidden="true"
        title="Drag"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="block rounded-full"
            style={{ width: 4, height: 4, background: dragDotColor }}
          />
        ))}
      </div>

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
