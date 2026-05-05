import { NextResponse } from "next/server";
import {
  GOOGLE_EMAIL_COOKIE,
  GOOGLE_REFRESH_COOKIE,
  exchangeCodeForTokens,
  fetchUserEmail,
  getRedirectUri,
} from "@/lib/google";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const errorUrl = new URL("/settings", request.url);

  if (error) {
    errorUrl.searchParams.set("google", "error");
    errorUrl.searchParams.set("reason", error);
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    errorUrl.searchParams.set("google", "error");
    errorUrl.searchParams.set("reason", "missing_code");
    return NextResponse.redirect(errorUrl);
  }

  try {
    const redirectUri = getRedirectUri(request);
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    const response = NextResponse.redirect(
      new URL("/settings?google=connected", request.url)
    );

    if (tokens.refresh_token) {
      response.cookies.set(GOOGLE_REFRESH_COOKIE, tokens.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    const email = await fetchUserEmail(tokens.access_token).catch(() => null);
    if (email) {
      response.cookies.set(GOOGLE_EMAIL_COOKIE, email, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return response;
  } catch (e) {
    errorUrl.searchParams.set("google", "error");
    errorUrl.searchParams.set(
      "reason",
      e instanceof Error ? e.message : "unknown"
    );
    return NextResponse.redirect(errorUrl);
  }
}
