"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "./client";
import { useSupabaseAuth } from "./auth";
import {
  REMOTE_UPDATE_EVENT,
  SETTINGS_CHANGED_EVENT,
  SYNCED_KEYS,
  UPDATED_AT_KEY,
} from "@/lib/storage";

export type SyncStatus =
  | "idle"
  | "disconnected"
  | "not-configured"
  | "loading"
  | "syncing"
  | "saved"
  | "error";

type Blob = {
  projects: unknown;
  history: unknown;
  settings: unknown;
  mood: unknown;
  updated_at: string;
};

const PUSH_DEBOUNCE_MS = 1500;
const POLL_MS = 15_000;

function readLocalBlob(): Blob {
  return {
    projects: JSON.parse(localStorage.getItem(SYNCED_KEYS.projects) ?? "[]"),
    history: JSON.parse(localStorage.getItem(SYNCED_KEYS.history) ?? "[]"),
    settings: JSON.parse(localStorage.getItem(SYNCED_KEYS.settings) ?? "null"),
    mood: JSON.parse(localStorage.getItem(SYNCED_KEYS.mood) ?? "\"normal\""),
    updated_at:
      localStorage.getItem(UPDATED_AT_KEY) || new Date(0).toISOString(),
  };
}

function writeLocalBlob(b: Blob) {
  localStorage.setItem(SYNCED_KEYS.projects, JSON.stringify(b.projects ?? []));
  localStorage.setItem(SYNCED_KEYS.history, JSON.stringify(b.history ?? []));
  if (b.settings !== null && b.settings !== undefined) {
    localStorage.setItem(SYNCED_KEYS.settings, JSON.stringify(b.settings));
  }
  if (b.mood !== null && b.mood !== undefined) {
    localStorage.setItem(SYNCED_KEYS.mood, JSON.stringify(b.mood));
  }
  localStorage.setItem(UPDATED_AT_KEY, b.updated_at);
  window.dispatchEvent(new Event(REMOTE_UPDATE_EVENT));
  window.dispatchEvent(new Event(SETTINGS_CHANGED_EVENT));
}

export function useSupabaseSync() {
  const { user, loading: authLoading, configured } = useSupabaseAuth();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRemoteAt = useRef<string | null>(null);

  // Pull from Supabase; if remote is newer, overwrite local; if local newer or
  // remote missing, push local up.
  const reconcile = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !user) return false;
    setStatus("syncing");
    try {
      const { data, error } = await supabase
        .from("user_state")
        .select("projects, history, settings, mood, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;

      const local = readLocalBlob();
      const localAt = new Date(local.updated_at).getTime();
      const remoteAt = data ? new Date(data.updated_at).getTime() : 0;

      if (data && remoteAt > localAt) {
        writeLocalBlob(data as Blob);
        lastRemoteAt.current = data.updated_at;
      } else if (!data || localAt > remoteAt) {
        const payload = {
          user_id: user.id,
          projects: local.projects,
          history: local.history,
          settings: local.settings,
          mood: local.mood,
        };
        const { data: up, error: upErr } = await supabase
          .from("user_state")
          .upsert(payload, { onConflict: "user_id" })
          .select("updated_at")
          .single();
        if (upErr) throw upErr;
        lastRemoteAt.current = up?.updated_at ?? local.updated_at;
        localStorage.setItem(UPDATED_AT_KEY, lastRemoteAt.current!);
      } else {
        lastRemoteAt.current = data.updated_at;
      }

      setStatus("saved");
      setLastSync(new Date().toISOString());
      return true;
    } catch (e) {
      console.error("[supabase-sync] reconcile failed", e);
      setStatus("error");
      return false;
    }
  }, [user]);

  // Initial pull when auth is ready.
  useEffect(() => {
    if (authLoading) return;
    if (!configured) {
      setStatus("not-configured");
      return;
    }
    if (!user) {
      setStatus("disconnected");
      return;
    }
    reconcile();
  }, [authLoading, configured, user, reconcile]);

  // Local changes → debounced push.
  useEffect(() => {
    if (!user) return;
    const schedulePush = () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => {
        reconcile();
      }, PUSH_DEBOUNCE_MS);
    };
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (
        e.key === SYNCED_KEYS.projects ||
        e.key === SYNCED_KEYS.history ||
        e.key === SYNCED_KEYS.settings ||
        e.key === SYNCED_KEYS.mood ||
        e.key === UPDATED_AT_KEY
      ) {
        schedulePush();
      }
    };
    window.addEventListener("storage", onStorage);
    // Also listen to in-tab changes (storage event doesn't fire in same tab).
    window.addEventListener(SETTINGS_CHANGED_EVENT, schedulePush);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SETTINGS_CHANGED_EVENT, schedulePush);
    };
  }, [user, reconcile]);

  // Local change detection — same tab. The storage layer bumps UPDATED_AT_KEY
  // on every project/history write, so we poll it cheaply rather than
  // monkey-patching every call site.
  useEffect(() => {
    if (!user) return;
    let lastSeen = localStorage.getItem(UPDATED_AT_KEY);
    const interval = setInterval(() => {
      const now = localStorage.getItem(UPDATED_AT_KEY);
      if (now && now !== lastSeen) {
        lastSeen = now;
        if (pushTimer.current) clearTimeout(pushTimer.current);
        pushTimer.current = setTimeout(() => reconcile(), PUSH_DEBOUNCE_MS);
      }
    }, 750);
    return () => clearInterval(interval);
  }, [user, reconcile]);

  // Periodic background pull so other devices' edits show up.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => reconcile(), POLL_MS);
    return () => clearInterval(interval);
  }, [user, reconcile]);

  const syncNow = useCallback(async () => reconcile(), [reconcile]);

  return { status, lastSync, syncNow, user, configured };
}
