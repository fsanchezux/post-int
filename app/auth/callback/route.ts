import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

// Supabase OAuth redirects back here with ?code=...&next=/
// Exchange the code for a session cookie, then bounce to `next` (or "/").
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (!code) {
    return NextResponse.redirect(new URL("/?auth_error=missing_code", url));
  }

  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.redirect(new URL("/?auth_error=not_configured", url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error.message)}`, url)
    );
  }
  return NextResponse.redirect(new URL(next, url));
}
