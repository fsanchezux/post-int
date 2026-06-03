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
} from "@/lib/storage";

export function Nav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { search, setSearch } = useBoardUI();

  if (pathname?.startsWith("/share/")) return null;

  const [connected, setConnected] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const signOut = async () => {
    try {
      await fetch("/api/auth/google/disconnect", { method: "POST" });
    } catch {
      // ignore — proceed to clear local state regardless
    }
    // Wipe per-account data so the next login starts clean for whichever
    // account links next (prevents the previous user's posits from leaking).
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
    setConnected(false);
    router.refresh();
  };

  const refresh = () => {
    fetch("/api/auth/google/status", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("status-fetch-failed");
        return r.json();
      })
      .then((d) => {
        if (d?.error) {
          signOut();
          return;
        }
        setConnected(!!d.connected);
      })
      .catch(() => {
        setConnected(false);
      })
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
            src="/post-int-logo.png"
            alt="Post-In't"
            width={220}
            height={60}
            priority
            className="h-10 w-auto object-contain"
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
                className="w-full pl-4 pr-10 py-2 rounded-full bg-blue-100/60 text-sm placeholder:text-blue-400/70 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500"
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
            onClick={() => setShortcutsOpen(true)}
            className="hidden sm:inline-flex px-2 py-1 text-xs font-semibold tracking-widest uppercase transition-colors hover:opacity-80"
            style={{ color: "#90beff" }}
            title="Keyboard shortcuts"
          >
            Shortcuts
          </button>
          {loaded && connected ? (
            <button
              onClick={signOut}
              className="px-2 py-1 text-xs font-semibold tracking-widest uppercase transition-colors inline-flex items-center gap-1.5 hover:opacity-80"
              style={{ color: "#90beff" }}
            >
              Log out
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          ) : loaded ? (
            <a
              href="/api/auth/google"
              className="px-2 py-1 text-xs font-semibold tracking-widest uppercase transition-colors hover:opacity-80"
              style={{ color: "#90beff" }}
            >
              Link account
            </a>
          ) : null}
        </div>
      </div>

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </header>
  );
}
