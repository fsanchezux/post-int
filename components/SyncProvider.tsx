"use client";

import { createContext, useContext, useEffect } from "react";
import { useCloudSync } from "@/lib/sync";
import { recordTodayOpened } from "@/lib/usageTracker";

type Ctx = ReturnType<typeof useCloudSync>;

const SyncContext = createContext<Ctx | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const value = useCloudSync();
  useEffect(() => {
    recordTodayOpened();
  }, []);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    return {
      status: "idle" as const,
      lastSync: null,
      syncNow: async () => false,
    };
  }
  return ctx;
}
