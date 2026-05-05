import { NextResponse } from "next/server";
import { GOOGLE_EMAIL_COOKIE, GOOGLE_REFRESH_COOKIE } from "@/lib/google";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  for (const name of [GOOGLE_REFRESH_COOKIE, GOOGLE_EMAIL_COOKIE]) {
    response.cookies.set(name, "", {
      httpOnly: name === GOOGLE_REFRESH_COOKIE,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
