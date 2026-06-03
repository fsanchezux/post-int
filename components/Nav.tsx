"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ShortcutsModal } from "./ShortcutsModal";
import { useBoardUI } from "./BoardUIContext";
import {
  REMOTE_UPDATE_EVENT,
  SYNC_EMAIL_KEY,
  SYNCED_KEYS,
  UPDATED_AT_KEY,
  useSettings,
} from "@/lib/storage";
import {
  useSupabaseAuth,
  signInWithGoogle,
  signOut as supabaseSignOut,
} from "@/lib/supabase/auth";

export function Nav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { search, setSearch } = useBoardUI();
  const { settings, updateSettings } = useSettings();
  const theme = settings?.theme ?? "light";
  const toggleTheme = () =>
    updateSettings({ theme: theme === "dark" ? "light" : "dark" });

  if (pathname?.startsWith("/share/")) return null;

  const { user, loading: authLoading, configured } = useSupabaseAuth();
  const connected = !!user;
  const loaded = !authLoading;
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const signOut = async () => {
    await supabaseSignOut();
    // Wipe per-account data so the next login starts clean.
    try {
      for (const key of Object.values(SYNCED_KEYS)) {
        localStorage.removeItem(key);
      }
      localStorage.removeItem(UPDATED_AT_KEY);
      localStorage.removeItem(SYNC_EMAIL_KEY);
      window.dispatchEvent(new Event(REMOTE_UPDATE_EVENT));
    } catch {
      // ignore storage errors
    }
    router.refresh();
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "." && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("shortcut:new-task"));
      }

      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("shortcut:save-task"));
      }

      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const el = document.getElementById("nav-search") as HTMLInputElement | null;
        el?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onBoard = pathname === "/";

  return (
    <header className="w-full">
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-3 flex items-center gap-4">
        <Link href="/" aria-label="Post-In't" className="block shrink-0">
          <Image
            src="/logo/logo-darkmode.png"
            alt="Post-In't"
            width={220}
            height={60}
            priority
            className="h-10 w-auto object-contain block dark:hidden"
          />
          <Image
            src="/logo/logo-white.png"
            alt="Post-In't"
            width={220}
            height={60}
            priority
            className="h-10 w-auto object-contain hidden dark:block"
          />
        </Link>

        {onBoard ? (
          <div className="flex-1 flex items-center gap-3 justify-center max-w-2xl mx-auto">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("shortcut:new-task"))}
              className="add-round shrink-0 hidden sm:flex"
              style={{ width: 34, height: 34 }}
              aria-label={t("home.createPosit")}
              title={t("home.createPosit")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="9" y1="3" x2="9" y2="15" />
                <line x1="3" y1="9" x2="15" y2="9" />
              </svg>
            </button>
            <div className="relative flex-1 max-w-md hidden sm:block">
              <input
                id="nav-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posits..."
                className="w-full pl-4 pr-10 py-2 rounded-full bg-zinc-200/70 dark:bg-zinc-600/80 text-sm text-zinc-700 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-400"
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-200"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:opacity-80"
            style={{ color: "#9ca3af" }}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShortcutsOpen(true)}
            className="hidden sm:inline-flex px-2 py-1 text-xs font-semibold tracking-widest uppercase transition-colors hover:opacity-80"
            style={{ color: "#9ca3af" }}
            title="Keyboard shortcuts"
          >
            Shortcuts
          </button>
          {loaded && connected ? (
            <button
              onClick={signOut}
              className="px-2 py-1 text-xs font-semibold tracking-widest uppercase transition-colors inline-flex items-center gap-1.5 hover:opacity-80"
              style={{ color: "#9ca3af" }}
            >
              Log out
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          ) : loaded && configured ? (
            <button
              onClick={handleSignIn}
              className="px-2 py-1 text-xs font-semibold tracking-widest uppercase transition-colors hover:opacity-80"
              style={{ color: "#9ca3af" }}
            >
              Link account
            </button>
          ) : null}
        </div>
      </div>

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </header>
  );
}
