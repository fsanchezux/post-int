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
  const [zoom, setZoom] = useState(1);
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
    if (hydrated) {
      calculateInitialFit();
    }
  }, [hydrated, calculateInitialFit]);

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
    setZoom(parseFloat(e.target.value));
  };

  const handleFitToScreen = () => {
    calculateInitialFit();
  };

  const handleEdgeZoom = useCallback((positPos: { x: number; y: number }, positSize: { w: number; h: number }) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerW = containerRect.width;
    const containerH = containerRect.height;

    const scaledX = positPos.x * zoom;
    const scaledY = positPos.y * zoom;
    const scaledW = positSize.w * zoom;
    const scaledH = positSize.h * zoom;

    const edgeThreshold = 20;
    const rightEdge = scaledX + scaledW;
    const bottomEdge = scaledY + scaledH;

    let needsZoomOut = 1;
    if (rightEdge > containerW - edgeThreshold) {
      needsZoomOut = Math.min(needsZoomOut, (containerW - edgeThreshold) / rightEdge);
    }
    if (bottomEdge > containerH - edgeThreshold) {
      needsZoomOut = Math.min(needsZoomOut, (containerH - edgeThreshold) / bottomEdge);
    }
    if (scaledX < edgeThreshold) {
      needsZoomOut = Math.min(needsZoomOut, (containerW - edgeThreshold) / rightEdge);
    }
    if (scaledY < edgeThreshold) {
      needsZoomOut = Math.min(needsZoomOut, (containerH - edgeThreshold) / bottomEdge);
    }

    if (needsZoomOut < 1) {
      setZoom((prev) => Math.max(0.2, prev * needsZoomOut));
    }
  }, [zoom]);

  return (
    <main>
      <section className="max-w-7xl mx-auto px-6 pb-10">
        <div className="flex items-center justify-end mb-3 gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
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
              value={zoom}
              onChange={handleZoomChange}
              className="w-24 sm:w-32 accent-zinc-600"
              aria-label="Zoom level"
            />
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
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
              {Math.round(zoom * 100)}%
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
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`,
            }}
          >
            {hydrated &&
              projects.map((p) => (
                <PostIt
                  key={p.id}
                  project={p}
                  onUpdate={updateProject}
                  onComplete={completeProject}
                  onRemove={removeProject}
                  onEdit={(proj) => setEditing(proj)}
                  onEdgeZoom={handleEdgeZoom}
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