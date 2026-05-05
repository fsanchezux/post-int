import { NextResponse } from "next/server";
import {
  SYNC_FILENAME,
  createAppDataFile,
  findAppDataFile,
  getRefreshTokenFromCookies,
  refreshAccessToken,
  updateAppDataFile,
} from "@/lib/google";

export async function POST(request: Request) {
  const refresh = await getRefreshTokenFromCookies();
  if (!refresh) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  let blob: unknown;
  try {
    blob = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    const { access_token, scope } = await refreshAccessToken(refresh);
    if (!scope?.includes("drive.appdata")) {
      return NextResponse.json(
        { connected: true, scopeMissing: true },
        { status: 403 }
      );
    }

    const existing = await findAppDataFile(access_token, SYNC_FILENAME);
    const file = existing
      ? await updateAppDataFile(access_token, existing.id, blob)
      : await createAppDataFile(access_token, SYNC_FILENAME, blob);

    return NextResponse.json({
      connected: true,
      fileId: file.id,
      modifiedTime: file.modifiedTime,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "unknown" },
      { status: 500 }
    );
  }
}
