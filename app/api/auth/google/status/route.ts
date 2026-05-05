import { NextResponse } from "next/server";
import {
  getEmailFromCookies,
  getRefreshTokenFromCookies,
} from "@/lib/google";

export async function GET() {
  const token = await getRefreshTokenFromCookies();
  const email = await getEmailFromCookies();
  return NextResponse.json({ connected: !!token, email });
}
