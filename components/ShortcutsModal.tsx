"use client";

import { useEffect } from "react";

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
  { keys: "Shift + Tab", description: "Select next posit", context: "Board" },
  { keys: "Arrow keys", description: "Move selected posit (1px)", context: "Board" },
  { keys: "Shift + Arrows", description: "Move selected posit (10px)", context: "Board" },
  { keys: "Shift + Space", description: "Cycle posit z-index (front/back)", context: "Board" },
  { keys: "Escape", description: "Deselect posit / Close modal", context: "Global" },
  { keys: "Shift / Alt + Scroll", description: "Zoom in / out", context: "Board" },
  { keys: "Ctrl + .", description: "Create new task", context: "Global" },
  { keys: "Ctrl + Enter", description: "Save current task", context: "Task editor" },
];

export function ShortcutsModal({ open, onClose }: Props) {
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
        className="rounded-lg p-6 w-full max-w-md shadow-2xl"
        style={{ background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">Keyboard Shortcuts</h2>
        <div className="space-y-2">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-2">
                <kbd
                  className="px-2 py-1 rounded font-mono text-xs font-semibold"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
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
            className="px-4 py-2 rounded text-sm font-medium transition-colors hover:opacity-90"
            style={{ background: "#9ca3af", color: "#fff" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
