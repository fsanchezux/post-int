"use client";

import { useState } from "react";
import type { Project } from "@/lib/types";
import { postItStyle } from "@/lib/colors";
import { uid } from "@/lib/storage";
import { useConfirm } from "./ConfirmDialog";

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

type Props = {
  project: Project;
  onUpdate: (id: string, patch: Partial<Project>) => void;
  onComplete: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (project: Project) => void;
  onAddImage?: () => void;
  onAddNote?: () => void;
  onAfterRemove?: () => void;
  onAfterComplete?: () => void;
  background?: string;
  iconColor?: string;
};

export function PositActionBar({
  project,
  onUpdate,
  onComplete,
  onRemove,
  onEdit,
  onAddImage,
  onAddNote,
  onAfterRemove,
  onAfterComplete,
  background,
  iconColor,
}: Props) {
  const confirm = useConfirm();
  const [sharing, setSharing] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const style = postItStyle(project);
  const barBg = background ?? style.bg;
  const icon = iconColor ?? "#1c1c1c";

  const startShare = async () => {
    if (sharing) return;
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

  const handleComplete = () => {
    onComplete(project.id);
    onAfterComplete?.();
  };

  const handleDisableShare = async () => {
    if (!project.shareId) return;
    const ok = await confirm({
      title: "Disable share",
      message: (
        <>
          Disable the public share link for <strong>{project.name}</strong>? The
          link will stop working.
        </>
      ),
      confirmLabel: "Disable",
      destructive: true,
    });
    if (!ok) return;
    try {
      await fetch(`/api/share/${project.shareId}`, { method: "DELETE" });
    } catch {
      // ignore — still clear locally
    }
    onUpdate(project.id, { shareId: undefined });
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: "Delete posit",
      message: (
        <>
          Delete <strong>{project.name}</strong>?
        </>
      ),
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) {
      onRemove(project.id);
      onAfterRemove?.();
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-2xl shadow-md"
      style={{ background: barBg }}
    >
      {project.shareId ? (
        <BarBtn label="Disable share" onClick={handleDisableShare} color={icon}>
          <ShareOffIcon />
        </BarBtn>
      ) : (
        <BarBtn label={shareCopied ? "Copied" : "Share"} onClick={startShare} color={icon}>
          {shareCopied ? <CheckIcon /> : <ShareIcon />}
        </BarBtn>
      )}
      <BarBtn label="Edit" onClick={() => onEdit(project)} color={icon}>
        <EditIcon />
      </BarBtn>
      {onAddNote && (
        <BarBtn label="Add note" onClick={onAddNote} color={icon}>
          <NoteIcon />
        </BarBtn>
      )}
      {onAddImage && (
        <BarBtn label="Add image" onClick={onAddImage} color={icon}>
          <ImageIcon />
        </BarBtn>
      )}
      <BarBtn label="Mark complete" onClick={handleComplete} color={icon}>
        <CheckCircleIcon />
      </BarBtn>
      <BarBtn label="Delete" onClick={handleDelete} color={icon}>
        <TrashIcon />
      </BarBtn>
    </div>
  );
}

function BarBtn({
  children,
  label,
  onClick,
  color,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-black/10 transition-colors"
      style={{ color: color ?? "#1c1c1c" }}
    >
      {children}
    </button>
  );
}

function ShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function ShareOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="8 12 11 15 16 9" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5 12 10 17 19 7" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="14" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
