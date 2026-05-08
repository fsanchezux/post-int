"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { SyncStatus } from "./SyncStatus";

const ROUTES = ["/", "/tasks", "/dashboard", "/history", "/settings"];

export function Nav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  if (pathname?.startsWith("/share/")) return null;

  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = () => {
    fetch("/api/auth/google/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setConnected(!!d.connected);
        setEmail(d.email ?? null);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  };

  useEffect(() => {
    refresh();
  }, [pathname]);

  const signOut = async () => {
    await fetch("/api/auth/google/disconnect", { method: "POST" });
    setConnected(false);
    setEmail(null);
    router.refresh();
  };

  const links = [
    { href: "/", label: t("nav.board") },
    { href: "/tasks", label: t("nav.tasks") },
    { href: "/dashboard", label: t("nav.dashboard") },
    { href: "/history", label: t("nav.history") },
    { href: "/settings", label: t("nav.settings") },
  ];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const currentIdx = ROUTES.findIndex((r) =>
          r === "/" ? pathname === "/" : pathname?.startsWith(r)
        );
        const nextIdx = (currentIdx + 1) % ROUTES.length;
        router.push(ROUTES[nextIdx]);
      }

      if (e.key === "." && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const event = new CustomEvent("shortcut:new-task");
        window.dispatchEvent(event);
      }

      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const event = new CustomEvent("shortcut:save-task");
        window.dispatchEvent(event);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  return (
    <header className="w-full">
      <div className="max-w-7xl mx-auto px-6 pt-6 flex items-start justify-between gap-4">
        <Link href="/" aria-label="Post-In't" className="block">
          <Image
            src="/post-int-logo.png"
            alt="Post-In't"
            width={220}
            height={60}
            priority
            className="h-12 w-auto object-contain"
          />
        </Link>

        <div className="mt-3 flex items-center gap-3">
          {!loaded ? null : connected ? (
            <>
              <SyncStatus />
              <span
                className="text-xs font-medium opacity-80 max-w-[220px] truncate"
                title={email ?? ""}
              >
                {email ?? t("settings.connected")}
              </span>
              <button
                onClick={signOut}
                className="text-xs font-semibold tracking-widest uppercase opacity-80 hover:opacity-100 underline-offset-2 hover:underline"
              >
                Sign out
              </button>
            </>
          ) : (
            <a
              href="/api/auth/google"
              className="text-xs font-semibold tracking-widest uppercase opacity-80 hover:opacity-100"
            >
              Link your account
            </a>
          )}
        </div>
      </div>

      <nav className="max-w-7xl mx-auto px-6 pt-5 pb-4 flex items-center gap-3 flex-wrap">
        {links.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-pill ${active ? "nav-pill--active" : "nav-pill--inactive"}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}