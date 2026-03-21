import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";

const SECRET = new TextEncoder().encode(process.env.ROOT_PASS || "jcos-yt-secret");
const COOKIE = "yt_session";
const TTL = 60 * 60 * 24 * 7; // 7 days

export interface YTSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export async function signSession(session: YTSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL}s`)
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<YTSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as YTSession;
  } catch {
    return null;
  }
}

export async function getAccessToken(cookieValue: string): Promise<string | null> {
  const session = await verifySession(cookieValue);
  if (!session) return null;

  // Refresh if expiring within 60 seconds
  if (Date.now() > session.expiresAt - 60_000) {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.YOUTUBE_CLIENT_ID!,
        client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
        refresh_token: session.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token;
  }

  return session.accessToken;
}

export function setCookieOnResponse(res: NextResponse, jwt: string) {
  res.cookies.set(COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL,
  });
}
