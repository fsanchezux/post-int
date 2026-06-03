"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useProjects } from "@/lib/storage";
import { PostIt } from "@/components/PostIt";
import { CreatePostItModal } from "@/components/CreatePostItModal";
import { PositDetailView } from "@/components/PositDetailView";
import { VerticalZoom } from "@/components/VerticalZoom";
import { useBoardUI } from "@/components/BoardUIContext";
import { useI18n } from "@/lib/i18n";
import type { Project } from "@/lib/types";

export default function Home() {
  const { t } = useI18n();
  const { search } = useBoardUI();
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
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [userAdjusted, setUserAdjusted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("board-zoom");
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0.2 && parsed <= 2) setZoom(parsed);
    }
  }, []);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.description?.toLowerCase().includes(q)) return true;
      if (p.tasks.some((tk) => tk.text.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [projects, search]);

  const focusedProject = focusedId
    ? projects.find((p) => p.id === focusedId) ?? null
    : null;

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
    if (zoom !== null) localStorage.setItem("board-zoom", String(zoom));
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
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (focusedId) return;

      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        if (projects.length === 0) return;
        const idx = projects.findIndex((p) => p.id === selectedId);
        const nextIdx = idx < 0 ? 0 : (idx + 1) % projects.length;
        setSelectedId(projects[nextIdx].id);
        return;
      }

      if (
        selectedId &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        const project = projects.find((p) => p.id === selectedId);
        if (!project) return;
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0;
        const dy = e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0;
        updateProject(selectedId, {
          position: {
            x: Math.max(0, project.position.x + dx),
            y: Math.max(0, project.position.y + dy),
          },
        });
        return;
      }

      if (e.key === " " && e.shiftKey && selectedId) {
        e.preventDefault();
        const project = projects.find((p) => p.id === selectedId);
        if (!project) return;
        const currentZ = project.zIndex ?? 0;
        const maxZ = Math.max(...projects.map((p) => p.zIndex ?? 0), 0);
        const newZ = currentZ >= maxZ ? -1 : maxZ + 1;
        updateProject(selectedId, { zIndex: newZ });
        return;
      }

      if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projects, selectedId, focusedId, updateProject]);

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

  if (focusedProject) {
    return (
      <main>
        <section className="max-w-7xl mx-auto px-6 pb-10">
          <PositDetailView
            project={focusedProject}
            onUpdate={updateProject}
            onComplete={(id) => {
              completeProject(id);
              setFocusedId(null);
            }}
            onRemove={(id) => {
              removeProject(id);
              setFocusedId(null);
            }}
            onEdit={(proj) => setEditing(proj)}
            onBack={() => setFocusedId(null)}
          />
        </section>

        <CreatePostItModal
          open={editing !== null}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          initial={editing ?? undefined}
        />
      </main>
    );
  }

  return (
    <main>
      <section className="max-w-7xl mx-auto px-6 pb-10">
        <div ref={containerRef} className="whiteboard relative">
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
              filteredProjects.map((p) => (
                <PostIt
                  key={p.id}
                  project={p}
                  zoom={zoom ?? 1}
                  zIndex={p.zIndex ?? 0}
                  selected={p.id === selectedId}
                  onSelect={() => setFocusedId(p.id)}
                  onUpdate={updateProject}
                />
              ))}
          </div>

          {hydrated && projects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-zinc-500 text-lg">{t("home.noPosits")}</p>
            </div>
          )}

          {hydrated && projects.length > 0 && filteredProjects.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-zinc-500 text-sm">No posits match &quot;{search}&quot;</p>
            </div>
          )}

          <VerticalZoom
            value={zoom ?? 1}
            onChange={(v) => { setUserAdjusted(true); setZoom(v); }}
            onFit={() => { setUserAdjusted(false); calculateInitialFit(); }}
          />
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

