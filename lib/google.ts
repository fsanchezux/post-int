import { cookies } from "next/headers";

export const GOOGLE_REFRESH_COOKIE = "pmw_gcal_refresh";
export const GOOGLE_EMAIL_COOKIE = "pmw_gcal_email";
export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/userinfo.email",
];
export const GOOGLE_OAUTH_SCOPE = GOOGLE_OAUTH_SCOPES.join(" ");
export const SYNC_FILENAME = "posits-data.json";

export type GoogleEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
};

export function getRedirectUri(request: Request) {
  const fromEnv = process.env.GOOGLE_REDIRECT_URI;
  if (fromEnv) return fromEnv;
  const url = new URL("/api/auth/google/callback", request.url);
  return url.toString();
}

export function getOAuthUrl(redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID no configurado");
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", GOOGLE_OAUTH_SCOPES.join(" "));
  u.searchParams.set("access_type", "offline");
  u.searchParams.set("prompt", "consent");
  u.searchParams.set("include_granted_scopes", "true");
  return u.toString();
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OAuth exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Refresh failed: ${res.status} ${text}`);
  }

  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

export async function createCalendarEvent(
  accessToken: string,
  event: {
    summary: string;
    description?: string;
    start: Date;
    end: Date;
  }
): Promise<{ id: string; htmlLink?: string }> {
  const url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start.toISOString() },
      end: { dateTime: event.end.toISOString() },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Calendar create failed: ${res.status} ${text}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as { id: string; htmlLink?: string };
  return data;
}

export async function fetchCalendarEvents(
  accessToken: string,
  timeMin: Date,
  timeMax: Date
): Promise<GoogleEvent[]> {
  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar fetch failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  type ApiEvent = {
    id: string;
    summary?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
  };
  const items = (data.items ?? []) as ApiEvent[];

  return items.map((ev) => {
    const allDay = !!ev.start.date && !ev.start.dateTime;
    return {
      id: ev.id,
      summary: ev.summary ?? "(sin título)",
      start: ev.start.dateTime ?? ev.start.date ?? "",
      end: ev.end.dateTime ?? ev.end.date ?? "",
      allDay,
    };
  });
}

export async function getRefreshTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(GOOGLE_REFRESH_COOKIE)?.value ?? null;
}

export async function getEmailFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(GOOGLE_EMAIL_COOKIE)?.value ?? null;
}

export async function fetchUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

type DriveFile = { id: string; name: string; modifiedTime: string };

export async function findAppDataFile(
  accessToken: string,
  name: string
): Promise<DriveFile | null> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("spaces", "appDataFolder");
  url.searchParams.set("q", `name='${name.replace(/'/g, "\\'")}'`);
  url.searchParams.set("fields", "files(id,name,modifiedTime)");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Drive list failed: ${res.status} ${body}`) as Error & {
      status?: number;
    };
    err.status = res.status;
    throw err;
  }
  const data = (await res.json()) as { files?: DriveFile[] };
  return data.files?.[0] ?? null;
}

export async function getAppDataFileContent<T = unknown>(
  accessToken: string,
  fileId: string
): Promise<T> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive get failed: ${res.status} ${body}`);
  }
  return (await res.json()) as T;
}

export async function createAppDataFile<T>(
  accessToken: string,
  name: string,
  content: T
): Promise<DriveFile> {
  const boundary = "pmw-blob-" + Math.random().toString(36).slice(2);
  const metadata = { name, parents: ["appDataFolder"] };
  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    "\r\n" +
    `--${boundary}\r\n` +
    "Content-Type: application/json\r\n\r\n" +
    JSON.stringify(content) +
    "\r\n" +
    `--${boundary}--`;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive create failed: ${res.status} ${text}`);
  }
  return (await res.json()) as DriveFile;
}

export async function updateAppDataFile<T>(
  accessToken: string,
  fileId: string,
  content: T
): Promise<DriveFile> {
  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,modifiedTime`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(content),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive update failed: ${res.status} ${text}`);
  }
  return (await res.json()) as DriveFile;
}
