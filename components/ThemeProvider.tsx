"use client";

import { ReactNode, useEffect } from "react";
import { useSettings } from "@/lib/storage";
import type { Theme } from "@/lib/types";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, hydrated } = useSettings();
  const theme: Theme = settings?.theme ?? "light";

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
  }, [theme, hydrated]);

  return <>{children}</>;
}
