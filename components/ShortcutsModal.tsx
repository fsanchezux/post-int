"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Shortcut = {
  keys: string;
  description: string;
  context: string;
};

const SHORTCUTS: Shortcut[] = [
  { keys: "Tab", description: "Navigate between pages", context: "Global" },
  { keys: "Shift / Alt + Scroll", description: "Zoom in / out", context: "Board" },
  { keys: "Ctrl + .", description: "Create new task", context: "Global" },
  { keys: "Ctrl + Enter", description: "Save current task", context: "Task editor" },
  { keys: "← →", description: "Navigate carousel", context: "Tasks" },
  { keys: "Ctrl + ,", description: "Random task", context: "Tasks" },
  { keys: "Escape", description: "Close editor / modal", context: "Global" },
];

export function ShortcutsModal({ open, onClose }: Props) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white text-zinc-900 rounded-lg p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
        <div className="space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded border bg-zinc-100 font-mono text-xs font-semibold">
                  {s.keys}
                </kbd>
                <span className="text-sm">{s.description}</span>
              </div>
              <span className="text-xs opacity-50 shrink-0">{s.context}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-zinc-900 text-white text-sm"
          >
            {t("common.close") ?? "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
