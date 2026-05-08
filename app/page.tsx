"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useProjects } from "@/lib/storage";
import { PostIt } from "@/components/PostIt";
import { CreatePostItModal } from "@/components/CreatePostItModal";
import { useI18n } from "@/lib/i18n";
import type { Project } from "@/lib/types";

export default function Home() {
  const { t } = useI18n();
  const {
    projects,
    hydrated,
    addProject,
    updateProject,
    completeProject,
    removeProject,
  } = useProjects();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [zoom, setZoom] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("board-zoom");
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.2 && parsed <= 2) return parsed;
      }
    }
    return null;
  });
  const [userAdjusted, setUserAdjusted] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const calculateInitialFit = useCallback(() => {
    if (!boardRef.current || !containerRef.current || projects.length === 0) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerW = containerRect.width;
    const containerH = containerRect.height;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    projects.forEach((p) => {
      const w = p.width ?? 384;
      const h = p.height ?? 220;
      const x = p.position.x;
      const y = p.position.y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const boardW = maxX - minX;
    const boardH = maxY - minY;
    const padding = 40;
    const scaleX = (containerW - padding * 2) / boardW;
    const scaleY = (containerH - padding * 2) / boardH;
    const newZoom = Math.min(scaleX, scaleY, 1);
    setZoom(Math.max(0.2, Math.min(newZoom, 2)));
  }, [projects]);

  useEffect(() => {
    if (hydrated && zoom === null && !userAdjusted) {
      calculateInitialFit();
    }
  }, [hydrated, calculateInitialFit, userAdjusted, zoom]);

  useEffect(() => {
    localStorage.setItem("board-zoom", String(zoom));
  }, [zoom]);

  useEffect(() => {
    const onNewTask = () => {
      setOpen(true);
      setEditing(null);
    };
    window.addEventListener("shortcut:new-task", onNewTask);
    return () => window.removeEventListener("shortcut:new-task", onNewTask);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey && !e.altKey) return;
      e.preventDefault();
      setUserAdjusted(true);
      setZoom((z) => {
        const current = z ?? 1;
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        return Math.max(0.2, Math.min(2, current + delta));
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleSave = (project: Project) => {
    if (editing) {
      const { id, ...patch } = project;
      updateProject(id, patch);
      setEditing(null);
    } else {
      addProject(project);
    }
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserAdjusted(true);
    setZoom(parseFloat(e.target.value));
  };

  const handleFitToScreen = () => {
    setUserAdjusted(false);
    calculateInitialFit();
  };

  return (
    <main>
      <section className="max-w-7xl mx-auto px-6 pb-10">
        <div className="flex items-center justify-end mb-3 gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setUserAdjusted(true); setZoom((z) => Math.max(0.2, (z ?? 1) - 0.1)); }}
              className="w-8 h-8 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center text-lg font-semibold transition-colors"
              aria-label="Zoom out"
            >
              −
            </button>
            <input
              type="range"
              min="0.2"
              max="2"
              step="0.05"
              value={zoom ?? 1}
              onChange={handleZoomChange}
              className="w-24 sm:w-32 accent-zinc-600"
              aria-label="Zoom level"
            />
            <button
              onClick={() => { setUserAdjusted(true); setZoom((z) => Math.min(2, (z ?? 1) + 0.1)); }}
              className="w-8 h-8 rounded-full bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center text-lg font-semibold transition-colors"
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              onClick={handleFitToScreen}
              className="text-xs px-2 py-1 rounded bg-zinc-200 hover:bg-zinc-300 transition-colors"
              aria-label="Fit to screen"
              title="Fit to screen"
            >
              {Math.round((zoom ?? 1) * 100)}%
            </button>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="add-round"
            aria-label={t("home.createPosit")}
          >
            +
          </button>
        </div>

        <div
          ref={containerRef}
          className="whiteboard"
        >
          <div
            ref={boardRef}
            style={{
              transform: zoom !== null ? `scale(${zoom})` : "scale(1)",
              transformOrigin: "top left",
              width: zoom !== null ? `${100 / zoom}%` : "100%",
              height: zoom !== null ? `${100 / zoom}%` : "100%",
            }}
          >
            {hydrated &&
              projects.map((p) => (
                <PostIt
                  key={p.id}
                  project={p}
                  zoom={zoom ?? 1}
                  onUpdate={updateProject}
                  onComplete={completeProject}
                  onRemove={removeProject}
                  onEdit={(proj) => setEditing(proj)}
                />
              ))}

            {hydrated && projects.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-zinc-500 text-lg">
                  {t("home.noPosits")}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <CreatePostItModal
        open={open || editing !== null}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        initial={editing ?? undefined}
      />
    </main>
  );
}