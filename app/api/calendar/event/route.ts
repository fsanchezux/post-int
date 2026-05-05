import { NextResponse } from "next/server";
import {
  createCalendarEvent,
  getRefreshTokenFromCookies,
  refreshAccessToken,
} from "@/lib/google";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const refresh = await getRefreshTokenFromCookies();
  if (!refresh) {
    return NextResponse.json(
      { error: "Not connected to Google Calendar" },
      { status: 401 }
    );
  }

  let body: {
    summary?: string;
    description?: string;
    start?: string;
    end?: string;
    durationMinutes?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const summary = body.summary?.trim();
  if (!summary) {
    return NextResponse.json({ error: "Missing summary" }, { status: 400 });
  }

  // Default: schedule for next available 30-minute slot starting in 5 minutes.
  const start = body.start ? new Date(body.start) : new Date(Date.now() + 5 * 60_000);
  const durationMinutes = body.durationMinutes ?? 30;
  const end = body.end
    ? new Date(body.end)
    : new Date(start.getTime() + durationMinutes * 60_000);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  try {
    const { access_token } = await refreshAccessToken(refresh);
    const event = await createCalendarEvent(access_token, {
      summary,
      description: body.description,
      start,
      end,
    });
    return NextResponse.json({ ok: true, event });
  } catch (e) {
    const status =
      e instanceof Error && (e as Error & { status?: number }).status === 403
        ? 403
        : 500;
    return NextResponse.json(
      {
        error:
          status === 403
            ? "Permission denied — please reconnect Google Calendar with calendar.events scope"
            : e instanceof Error
            ? e.message
            : "Failed to create event",
      },
      { status }
    );
  }
}
