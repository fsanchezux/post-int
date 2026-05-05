"use client";

import { useCallback, useEffect, useState } from "react";
import type { Mood, Project, Settings } from "./types";

const PROJECTS_KEY = "pmw:projects";
const HISTORY_KEY = "pmw:history";
const SETTINGS_KEY = "pmw:settings";
const MOOD_KEY = "pmw:mood";
export const UPDATED_AT_KEY = "pmw:updatedAt";
export const REMOTE_UPDATE_EVENT = "pmw:remote-update";

export const SYNCED_KEYS = {
  projects: PROJECTS_KEY,
  history: HISTORY_KEY,
  settings: SETTINGS_KEY,
  mood: MOOD_KEY,
} as const;

const defaultSettings: Settings = {
  workSchedule: [
    { day: 1, start: "09:00", end: "17:00" },
    { day: 2, start: "09:00", end: "17:00" },
    { day: 3, start: "09:00", end: "17:00" },
    { day: 4, start: "09:00", end: "17:00" },
    { day: 5, start: "09:00", end: "17:00" },
  ],
  googleConnected: false,
  notionConnected: false,
  events: [],
  language: "en",
};

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  if (key !== UPDATED_AT_KEY && key in Object.fromEntries(Object.entries(SYNCED_KEYS).map(([k, v]) => [v, k]))) {
    window.localStorage.setItem(UPDATED_AT_KEY, new Date().toISOString());
  }
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [history, setHistory] = useState<Project[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const migrate = (list: Project[]): Project[] =>
      list.map((p) => ({
        ...p,
        tasks: (p.tasks ?? []).map((t) => ({
          ...t,
          difficulty: (t.difficulty ?? 2) as 1 | 2 | 3,
        })),
      }));
    const reload = () => {
      setProjects(migrate(readJSON<Project[]>(PROJECTS_KEY, [])));
      setHistory(migrate(readJSON<Project[]>(HISTORY_KEY, [])));
    };
    reload();
    setHydrated(true);

    const sync = (e: StorageEvent) => {
      if (e.key === PROJECTS_KEY) setProjects(migrate(readJSON<Project[]>(PROJECTS_KEY, [])));
      if (e.key === HISTORY_KEY) setHistory(migrate(readJSON<Project[]>(HISTORY_KEY, [])));
    };
    window.addEventListener("storage", sync);
    window.addEventListener(REMOTE_UPDATE_EVENT, reload);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(REMOTE_UPDATE_EVENT, reload);
    };
  }, []);

  const persistProjects = useCallback((next: Project[]) => {
    setProjects(next);
    writeJSON(PROJECTS_KEY, next);
  }, []);

  const persistHistory = useCallback((next: Project[]) => {
    setHistory(next);
    writeJSON(HISTORY_KEY, next);
  }, []);

  const addProject = useCallback(
    (p: Project) => {
      persistProjects([...projects, p]);
    },
    [projects, persistProjects]
  );

  const updateProject = useCallback(
    (id: string, patch: Partial<Project>) => {
      persistProjects(projects.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    },
    [projects, persistProjects]
  );

  const removeProject = useCallback(
    (id: string) => {
      persistProjects(projects.filter((p) => p.id !== id));
    },
    [projects, persistProjects]
  );

  const completeProject = useCallback(
    (id: string) => {
      const target = projects.find((p) => p.id === id);
      if (!target) return;
      const completed = { ...target, completedAt: new Date().toISOString() };
      persistHistory([completed, ...history]);
      persistProjects(projects.filter((p) => p.id !== id));
    },
    [projects, history, persistProjects, persistHistory]
  );

  const restoreFromHistory = useCallback(
    (id: string) => {
      const target = history.find((p) => p.id === id);
      if (!target) return;
      const restored = { ...target, completedAt: undefined };
      persistProjects([...projects, restored]);
      persistHistory(history.filter((p) => p.id !== id));
    },
    [projects, history, persistProjects, persistHistory]
  );

  const clearHistoryEntry = useCallback(
    (id: string) => {
      persistHistory(history.filter((p) => p.id !== id));
    },
    [history, persistHistory]
  );

  return {
    projects,
    history,
    hydrated,
    addProject,
    updateProject,
    removeProject,
    completeProject,
    restoreFromHistory,
    clearHistoryEntry,
  };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const reload = () => setSettings(readJSON<Settings>(SETTINGS_KEY, defaultSettings));
    reload();
    setHydrated(true);
    window.addEventListener(REMOTE_UPDATE_EVENT, reload);
    return () => window.removeEventListener(REMOTE_UPDATE_EVENT, reload);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeJSON(SETTINGS_KEY, next);
      return next;
    });
  }, []);

  return { settings, hydrated, updateSettings };
}

export function useMood() {
  const [mood, setMoodState] = useState<Mood>("normal");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const reload = () => setMoodState(readJSON<Mood>(MOOD_KEY, "normal"));
    reload();
    setHydrated(true);
    window.addEventListener(REMOTE_UPDATE_EVENT, reload);
    return () => window.removeEventListener(REMOTE_UPDATE_EVENT, reload);
  }, []);

  const setMood = useCallback((m: Mood) => {
    setMoodState(m);
    writeJSON(MOOD_KEY, m);
  }, []);

  return { mood, setMood, hydrated };
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
