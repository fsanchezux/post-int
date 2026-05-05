/**
 * Pluggable share-store with three drivers:
 *
 *   1. Upstash Redis (recommended for production / serverless).
 *      Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 *      https://upstash.com — free tier is plenty for share blobs.
 *
 *   2. Local filesystem (default in dev). Files in `.share-store/{id}.json`.
 *      Won't persist across Vercel serverless cold starts; only safe on a
 *      long-running server (Docker, VPS, `next start`).
 *
 *   3. In-memory Map (last-resort fallback). Volatile per process.
 *      Warns at boot.
 *
 * The driver is resolved lazily on first call so adding env vars later does
 * not require a code change.
 */

import fs from "fs/promises";
import path from "path";

export type SharePayload = {
  name: string;
  description?: string;
  showDescription?: boolean;
  color?: string;
  links?: { url: string; label?: string }[];
  showProgress?: boolean;
  startDate?: string;
  endDate?: string;
  paid?: boolean;
  amount?: number;
  tasks: {
    id: string;
    text: string;
    done: boolean;
    autoTag?: "easy" | "medium" | "hard";
  }[];
  updatedAt: string;
};

const SHARE_ID_RE = /^[a-z0-9_-]{6,64}$/i;
export function isValidShareId(id: string): boolean {
  return SHARE_ID_RE.test(id);
}

interface Driver {
  name: string;
  read(id: string): Promise<SharePayload | null>;
  write(id: string, data: SharePayload): Promise<void>;
  delete(id: string): Promise<void>;
}

// ---------- Filesystem driver ----------

function fsDriver(): Driver {
  const DIR = path.join(process.cwd(), ".share-store");
  return {
    name: "fs",
    async read(id) {
      try {
        const buf = await fs.readFile(path.join(DIR, `${id}.json`), "utf-8");
        return JSON.parse(buf) as SharePayload;
      } catch {
        return null;
      }
    },
    async write(id, data) {
      await fs.mkdir(DIR, { recursive: true });
      await fs.writeFile(path.join(DIR, `${id}.json`), JSON.stringify(data));
    },
    async delete(id) {
      try {
        await fs.unlink(path.join(DIR, `${id}.json`));
      } catch {}
    },
  };
}

// ---------- Upstash Redis driver ----------

function upstashDriver(url: string, token: string): Driver {
  const auth = { Authorization: `Bearer ${token}` };
  const key = (id: string) => `pmw:share:${id}`;

  return {
    name: "upstash",
    async read(id) {
      const res = await fetch(`${url}/get/${encodeURIComponent(key(id))}`, {
        headers: auth,
        cache: "no-store",
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { result: string | null };
      if (!body.result) return null;
      try {
        return JSON.parse(body.result) as SharePayload;
      } catch {
        return null;
      }
    },
    async write(id, data) {
      const res = await fetch(`${url}/set/${encodeURIComponent(key(id))}`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Upstash write failed: ${res.status}`);
    },
    async delete(id) {
      await fetch(`${url}/del/${encodeURIComponent(key(id))}`, {
        method: "POST",
        headers: auth,
      }).catch(() => {});
    },
  };
}

// ---------- Memory fallback ----------

function memoryDriver(): Driver {
  const store = new Map<string, SharePayload>();
  return {
    name: "memory",
    async read(id) {
      return store.get(id) ?? null;
    },
    async write(id, data) {
      store.set(id, data);
    },
    async delete(id) {
      store.delete(id);
    },
  };
}

// ---------- Driver resolution ----------

let cached: Driver | null = null;

function resolveDriver(): Driver {
  if (cached) return cached;

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) {
    cached = upstashDriver(upstashUrl, upstashToken);
    return cached;
  }

  // On Vercel serverless the filesystem under /var/task is read-only and
  // /tmp doesn't persist across invocations, so fall back to memory there.
  if (process.env.VERCEL) {
    if (typeof console !== "undefined") {
      console.warn(
        "[shareStore] Running on Vercel without UPSTASH_REDIS_REST_URL — " +
          "shared links will be lost on cold start. Set Upstash env vars."
      );
    }
    cached = memoryDriver();
    return cached;
  }

  cached = fsDriver();
  return cached;
}

export async function readShare(id: string): Promise<SharePayload | null> {
  return resolveDriver().read(id);
}

export async function writeShare(id: string, data: SharePayload): Promise<void> {
  return resolveDriver().write(id, data);
}

export async function deleteShare(id: string): Promise<void> {
  return resolveDriver().delete(id);
}

export function shareDriverName(): string {
  return resolveDriver().name;
}
