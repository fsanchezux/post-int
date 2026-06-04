"use client";

import { useEffect, useState } from "react";
import { STORAGE_QUOTA_EVENT } from "@/lib/storage";

type Detail = { key: string; sizeKB: number };

export function StorageQuotaToast() {
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    const onQuota = (e: Event) => {
      const ce = e as CustomEvent<Detail>;
      setDetail(ce.detail);
      // Auto-dismiss after 10s
      setTimeout(() => setDetail(null), 10_000);
    };
    window.addEventListener(STORAGE_QUOTA_EVENT, onQuota as EventListener);
    return () =>
      window.removeEventListener(STORAGE_QUOTA_EVENT, onQuota as EventListener);
  }, []);

  if (!detail) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-[60] max-w-xs rounded-lg shadow-lg p-3 text-sm"
      style={{
        background: "var(--surface)",
        color: "var(--ink)",
        border: "1px solid #ef4444",
      }}
    >
      <div className="font-semibold text-red-500 mb-1">Almacenamiento lleno</div>
      <div className="opacity-80 text-xs leading-snug">
        Los cambios no se han podido guardar localmente (~5 MB de límite).
        Borra imágenes antiguas de tus posits o reduce su número para liberar
        espacio.
      </div>
      <button
        onClick={() => setDetail(null)}
        className="mt-2 text-xs underline opacity-70 hover:opacity-100"
      >
        Cerrar
      </button>
    </div>
  );
}
