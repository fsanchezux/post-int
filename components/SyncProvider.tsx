"use client";

import { createContext, useContext, useEffect } from "react";
import { useSupabaseSync } from "@/lib/supabase/sync";
import { recordTodayOpened } from "@/lib/usageTracker";

type Ctx = ReturnType<typeof useSupabaseSync>;

const SyncContext = createContext<Ctx | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const value = useSupabaseSync();
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
      user: null,
      configured: false,
    };
  }
  return ctx;
}
