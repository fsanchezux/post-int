import { NextResponse } from "next/server";
import { getOAuthUrl, getRedirectUri } from "@/lib/google";

export async function GET(request: Request) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      {
        error:
          "Faltan GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET en las variables de entorno.",
      },
      { status: 500 }
    );
  }

  const redirectUri = getRedirectUri(request);
  const url = getOAuthUrl(redirectUri);
  return NextResponse.redirect(url);
}
