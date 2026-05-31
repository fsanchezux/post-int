import { NextResponse } from "next/server";
import {
  SYNC_FILENAME,
  findAppDataFile,
  getAppDataFileContent,
  getEmailFromCookies,
  getRefreshTokenFromCookies,
  refreshAccessToken,
} from "@/lib/google";

export async function GET() {
  const refresh = await getRefreshTokenFromCookies();
  if (!refresh) {
    return NextResponse.json({ connected: false });
  }
  const email = await getEmailFromCookies();

  try {
    const { access_token, scope } = await refreshAccessToken(refresh);
    if (!scope?.includes("drive.appdata")) {
      return NextResponse.json({
        connected: true,
        email,
        scopeMissing: true,
        blob: null,
      });
    }

    const file = await findAppDataFile(access_token, SYNC_FILENAME);
    if (!file) {
      return NextResponse.json({ connected: true, email, blob: null });
    }

    const blob = await getAppDataFileContent(access_token, file.id);
    return NextResponse.json({
      connected: true,
      email,
      fileId: file.id,
      modifiedTime: file.modifiedTime,
      blob,
    });
  } catch (e) {
    return NextResponse.json(
      {
        connected: true,
        email,
        error: e instanceof Error ? e.message : "unknown",
        blob: null,
      },
      { status: 200 }
    );
  }
}
