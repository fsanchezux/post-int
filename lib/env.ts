/**
 * Server-side environment variable surface. Read-only.
 *
 * Optional integrations degrade gracefully when their vars are absent:
 *  - Google OAuth (Calendar + Drive)  → GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 *  - LLM auto-tagging                 → GROQ_API_KEY (preferred) or HF_API_KEY
 *  - Persistent share store           → UPSTASH_REDIS_REST_URL + TOKEN
 *
 * Nothing here is required at build time. Missing vars are reported via
 * `featureFlags()` so the UI can show informative empty states instead of
 * crashing.
 */

export const env = {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI ?? "",
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
  GROQ_MODEL: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
  HF_API_KEY: process.env.HF_API_KEY ?? "",
  HF_MODEL: process.env.HF_MODEL ?? "",
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? "",
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
} as const;

export type FeatureFlags = {
  googleAuth: boolean;
  llmTagging: boolean;
  persistentShare: boolean;
};

export function featureFlags(): FeatureFlags {
  return {
    googleAuth: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    llmTagging: !!(env.GROQ_API_KEY || env.HF_API_KEY),
    persistentShare:
      !!(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN),
  };
}
