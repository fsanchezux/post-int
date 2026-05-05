"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ConfirmOptions = {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmCtx = (opts: ConfirmOptions) => Promise<boolean>;

const Ctx = createContext<ConfirmCtx | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm: ConfirmCtx = useCallback((options) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (value: boolean) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      {open && opts && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={() => close(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-sm shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            {opts.title && (
              <h3 className="text-base font-semibold mb-2">{opts.title}</h3>
            )}
            <div className="text-sm opacity-90">{opts.message}</div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                autoFocus
                onClick={() => close(false)}
                className="px-4 py-1.5 rounded border text-sm"
              >
                {opts.cancelLabel ?? "Cancelar"}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-4 py-1.5 rounded text-sm font-medium text-white ${
                  opts.destructive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800"
                }`}
              >
                {opts.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}
