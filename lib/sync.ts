"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  REMOTE_UPDATE_EVENT,
  SYNC_EMAIL_KEY,
  SYNCED_KEYS,
  UPDATED_AT_KEY,
} from "./storage";

export type SyncStatus =
  | "idle"
  | "loading"
  | "syncing"
  | "saved"
  | "error"
  | "disconnected"
  | "scope-missing";

type Blob = {
  version: 1;
  updatedAt: string;
  projects: unknown;
  history: unknown;
  settings: unknown;
  mood: unknown;
};

const POLL_MS = 5000;

function hasLocalContent(): boolean {
  const projects = JSON.parse(localStorage.getItem(SYNCED_KEYS.projects) ?? "[]");
  const history = JSON.parse(localStorage.getItem(SYNCED_KEYS.history) ?? "[]");
  return (
    (Array.isArray(projects) && projects.length > 0) ||
    (Array.isArray(history) && history.length > 0)
  );
}

function readLocal(): { blob: Blob; updatedAt: string | null } {
  let updatedAt = localStorage.getItem(UPDATED_AT_KEY);
  // If we have content but no timestamp (legacy data, restore, etc.) backfill it
  // so the very first sync after Google connection still pushes.
  if (!updatedAt && hasLocalContent()) {
    updatedAt = new Date().toISOString();
    localStorage.setItem(UPDATED_AT_KEY, updatedAt);
  }
  return {
    updatedAt,
    blob: {
      version: 1,
      updatedAt: updatedAt ?? new Date(0).toISOString(),
      projects: JSON.parse(localStorage.getItem(SYNCED_KEYS.projects) ?? "[]"),
      history: JSON.parse(localStorage.getItem(SYNCED_KEYS.history) ?? "[]"),
      settings: JSON.parse(localStorage.getItem(SYNCED_KEYS.settings) ?? "null"),
      mood: JSON.parse(localStorage.getItem(SYNCED_KEYS.mood) ?? "\"normal\""),
    },
  };
}

function wipeLocal() {
  for (const key of Object.values(SYNCED_KEYS)) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem(UPDATED_AT_KEY);
  window.dispatchEvent(new Event(REMOTE_UPDATE_EVENT));
}

function applyRemote(blob: Blob) {
  if (blob.projects !== undefined)
    localStorage.setItem(SYNCED_KEYS.projects, JSON.stringify(blob.projects));
  if (blob.history !== undefined)
    localStorage.setItem(SYNCED_KEYS.history, JSON.stringify(blob.history));
  if (blob.settings !== undefined && blob.settings !== null)
    localStorage.setItem(SYNCED_KEYS.settings, JSON.stringify(blob.settings));
  if (blob.mood !== undefined)
    localStorage.setItem(SYNCED_KEYS.mood, JSON.stringify(blob.mood));
  localStorage.setItem(UPDATED_AT_KEY, blob.updatedAt);
  window.dispatchEvent(new Event(REMOTE_UPDATE_EVENT));
}

export function useCloudSync() {
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const lastPushedAt = useRef<string | null>(null);
  const initialised = useRef(false);

  const push = useCallback(async () => {
    const { blob } = readLocal();
    if (!blob.updatedAt || blob.updatedAt === lastPushedAt.current) return false;
    setStatus("syncing");
    try {
      const res = await fetch("/api/sync/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(blob),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setStatus("disconnected");
        } else if (res.status === 403) {
          setStatus("scope-missing");
        } else {
          setStatus("error");
        }
        return false;
      }
      lastPushedAt.current = blob.updatedAt;
      setLastSync(new Date());
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
      return true;
    } catch {
      setStatus("error");
      return false;
    }
  }, []);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    (async () => {
      setStatus("loading");
      try {
        const res = await fetch("/api/sync/load", { cache: "no-store" });
        const data = await res.json();

        if (!data.connected) {
          setStatus("disconnected");
          return;
        }
        if (data.scopeMissing) {
          setStatus("scope-missing");
          return;
        }

        const currentEmail: string | null = data.email ?? null;
        const lastEmail = localStorage.getItem(SYNC_EMAIL_KEY);
        const accountChanged =
          !!currentEmail && !!lastEmail && currentEmail !== lastEmail;

        if (accountChanged) {
          // A different Google account just connected.
          // The local data belongs to the previous account — wipe it before
          // adopting the new account's remote blob.
          wipeLocal();
          lastPushedAt.current = null;
        }

        const remote: Blob | null = data.blob;

        // Re-read local state AFTER the optional wipe.
        const local = readLocal();

        if (!remote) {
          if (currentEmail) localStorage.setItem(SYNC_EMAIL_KEY, currentEmail);
          if (local.updatedAt) {
            // No remote blob yet — push whatever is local to claim the
            // remote storage for this account.
            await push();
          } else {
            setStatus("idle");
          }
          return;
        }

        const remoteTime = remote.updatedAt
          ? new Date(remote.updatedAt).getTime()
          : 0;
        const localTime = local.updatedAt
          ? new Date(local.updatedAt).getTime()
          : 0;

        if (accountChanged || remoteTime > localTime) {
          applyRemote(remote);
          lastPushedAt.current = remote.updatedAt;
          setLastSync(new Date());
          setStatus("idle");
        } else if (localTime > remoteTime) {
          await push();
        } else {
          lastPushedAt.current = local.updatedAt;
          setStatus("idle");
        }

        if (currentEmail) localStorage.setItem(SYNC_EMAIL_KEY, currentEmail);
      } catch {
        setStatus("error");
      }
    })();
  }, [push]);

  useEffect(() => {
    if (status === "disconnected" || status === "scope-missing") return;
    const interval = setInterval(() => {
      const now = localStorage.getItem(UPDATED_AT_KEY);
      if (now && now !== lastPushedAt.current) {
        push();
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [push, status]);

  useEffect(() => {
    const onHide = () => {
      const now = localStorage.getItem(UPDATED_AT_KEY);
      if (now && now !== lastPushedAt.current) {
        navigator.sendBeacon?.(
          "/api/sync/save",
          new Blob([JSON.stringify(readLocal().blob)], {
            type: "application/json",
          })
        );
      }
    };
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") onHide();
    });
    return () => window.removeEventListener("beforeunload", onHide);
  }, []);

  return { status, lastSync, syncNow: push };
}
