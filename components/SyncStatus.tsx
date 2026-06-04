"use client";

import { useSync } from "./SyncProvider";
import { signInWithGoogle } from "@/lib/supabase/auth";

function timeAgo(iso: string) {
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "ahora";
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export function SyncStatus() {
  const { status, lastSync, syncNow } = useSync();

  let label: React.ReactNode = "";
  let dotClass = "bg-zinc-400";
  let title = "";

  switch (status) {
    case "loading":
      label = "Cargando…";
      dotClass = "bg-amber-400 animate-pulse";
      break;
    case "syncing":
      label = "Sincronizando…";
      dotClass = "bg-amber-500 animate-pulse";
      break;
    case "saved":
      label = "Guardado";
      dotClass = "bg-emerald-500";
      break;
    case "idle":
      label = lastSync ? timeAgo(lastSync) : "";
      dotClass = "bg-emerald-500";
      title = lastSync
        ? `Última sincronización: ${new Date(lastSync).toLocaleTimeString("es-ES")}`
        : "Sincronizado";
      break;
    case "disconnected":
      return (
        <button
          onClick={() => signInWithGoogle().catch(() => {})}
          className="text-xs px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          title="Conecta tu cuenta para sincronizar entre dispositivos"
        >
          ☁ Conectar
        </button>
      );
    case "not-configured":
      return null;
    case "error":
      label = "Error";
      dotClass = "bg-red-500";
      break;
  }

  return (
    <button
      onClick={() => syncNow()}
      className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
      title={title || "Click para sincronizar ahora"}
    >
      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
      <span className="opacity-70">{label}</span>
    </button>
  );
}
