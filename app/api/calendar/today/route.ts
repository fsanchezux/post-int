import { NextResponse } from "next/server";
import {
  fetchCalendarEvents,
  getRefreshTokenFromCookies,
  refreshAccessToken,
} from "@/lib/google";

export async function GET() {
  const refresh = await getRefreshTokenFromCookies();
  if (!refresh) {
    return NextResponse.json({ connected: false, events: [] });
  }

  try {
    const { access_token } = await refreshAccessToken(refresh);

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const events = await fetchCalendarEvents(access_token, start, end);
    return NextResponse.json({ connected: true, events });
  } catch (e) {
    return NextResponse.json(
      {
        connected: false,
        events: [],
        error: e instanceof Error ? e.message : "unknown",
      },
      { status: 200 }
    );
  }
}
