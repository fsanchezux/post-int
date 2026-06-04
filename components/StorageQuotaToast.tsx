"use client";

import { useEffect, useState } from "react";
import { STORAGE_QUOTA_EVENT } from "@/lib/storage";
import { cleanupStorage, type CleanupReport } from "@/lib/imageCleanup";

type Detail = { key: string; sizeKB: number };

export function StorageQuotaToast() {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [report, setReport] = useState<CleanupReport | null>(null);

  useEffect(() => {
    const onQuota = (e: Event) => {
      const ce = e as CustomEvent<Detail>;
      setDetail(ce.detail);
      setReport(null);
    };
    window.addEventListener(STORAGE_QUOTA_EVENT, onQuota as EventListener);

    // Proactive warning: if local storage is already > 80% of the typical
    // 5 MB cap, surface the cleanup option before a write actually fails.
    const SOFT_CAP_KB = 4 * 1024;
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        totalBytes += (localStorage.getItem(k) ?? "").length + k.length;
      }
      const sizeKB = Math.round(totalBytes / 1024);
      if (sizeKB > SOFT_CAP_KB) {
        setDetail({ key: "(proactive)", sizeKB });
      }
    } catch {
      // ignore — proactive check is best-effort
    }

    // Power-user helper: window.pmwCleanupStorage() from devtools.
    (window as unknown as { pmwCleanupStorage?: () => void })
      .pmwCleanupStorage = async () => {
      const r = await cleanupStorage();
      console.info("[pmw] cleanup", r);
      setReport(r);
      setDetail(null);
    };

    return () => {
      window.removeEventListener(STORAGE_QUOTA_EVENT, onQuota as EventListener);
      delete (window as unknown as { pmwCleanupStorage?: () => void })
        .pmwCleanupStorage;
    };
  }, []);

  if (!detail && !report) return null;

  const runCleanup = async () => {
    if (cleaning) return;
    setCleaning(true);
    try {
      const r = await cleanupStorage();
      setReport(r);
      setDetail(null);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-[60] max-w-xs rounded-lg shadow-lg p-3 text-sm"
      style={{
        background: "var(--surface)",
        color: "var(--ink)",
        border: report ? "1px solid #10b981" : "1px solid #ef4444",
      }}
    >
      {report ? (
        <>
          <div className="font-semibold text-emerald-500 mb-1">
            Limpieza completada
          </div>
          <div className="opacity-80 text-xs leading-snug">
            Liberados <strong>{report.savedKB} KB</strong> ({report.beforeKB} →
            {" "}{report.afterKB} KB).
            <br />
            {report.imagesRecompressed > 0 && (
              <>· {report.imagesRecompressed} imágenes recomprimidas<br /></>
            )}
            {report.imagesDroppedFromHistory > 0 && (
              <>
                · {report.imagesDroppedFromHistory} imágenes borradas del
                historial
                <br />
              </>
            )}
          </div>
          <button
            onClick={() => setReport(null)}
            className="mt-2 text-xs underline opacity-70 hover:opacity-100"
          >
            Cerrar
          </button>
        </>
      ) : (
        <>
          <div className="font-semibold text-red-500 mb-1">
            Almacenamiento lleno
          </div>
          <div className="opacity-80 text-xs leading-snug">
            Los cambios no se han podido guardar localmente (~5 MB de límite).
            Puedes liberar espacio comprimiendo las imágenes ya guardadas y
            borrando las de proyectos completados.
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={runCleanup}
              disabled={cleaning}
              className="text-xs px-2 py-1 rounded font-medium text-white disabled:opacity-60"
              style={{ background: "#10b981" }}
            >
              {cleaning ? "Limpiando…" : "Limpiar ahora"}
            </button>
            <button
              onClick={() => setDetail(null)}
              className="text-xs underline opacity-70 hover:opacity-100"
            >
              Cerrar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
