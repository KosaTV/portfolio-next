import { NextRequest, NextResponse } from "next/server";
import { signSession, setCookieOnResponse } from "../lib";

export async function GET(req: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL!;
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${base}/${process.env.ADMIN_PATH}?yt=error`);
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirect_uri: `${base}/api/youtube/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/${process.env.ADMIN_PATH}?yt=error`);
  }

  const { access_token, refresh_token, expires_in } = await tokenRes.json();

  const jwt = await signSession({
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresAt: Date.now() + expires_in * 1000,
  });

  const res = NextResponse.redirect(`${base}/${process.env.ADMIN_PATH}?yt=ok`);
  setCookieOnResponse(res, jwt);
  return res;
}
