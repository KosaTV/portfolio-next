import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "../lib";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("yt_session")?.value;
  if (!cookie) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const token = await getAccessToken(cookie);
  if (!token) return NextResponse.json({ error: "Session expired" }, { status: 401 });

  const res = await fetch(
    "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50",
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return NextResponse.json({ error: "YouTube API error" }, { status: res.status });
  return NextResponse.json(await res.json());
}
