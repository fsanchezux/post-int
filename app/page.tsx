"use client";

import { useState } from "react";
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

  const handleSave = (project: Project) => {
    if (editing) {
      const { id, ...patch } = project;
      updateProject(id, patch);
      setEditing(null);
    } else {
      addProject(project);
    }
  };

  return (
    <main>
      <section className="max-w-7xl mx-auto px-6 pb-10">
        <div className="flex items-center justify-end mb-3">
          <button
            onClick={() => setOpen(true)}
            className="add-round"
            aria-label={t("home.createPosit")}
          >
            +
          </button>
        </div>

        <div className="whiteboard">
          {hydrated &&
            projects.map((p) => (
              <PostIt
                key={p.id}
                project={p}
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