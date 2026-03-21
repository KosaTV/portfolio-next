import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "../lib";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("yt_session")?.value;
  const playlistId = req.nextUrl.searchParams.get("id");
  const pageToken = req.nextUrl.searchParams.get("pageToken") ?? "";

  if (!cookie) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!playlistId) return NextResponse.json({ error: "Missing playlist id" }, { status: 400 });

  const token = await getAccessToken(cookie);
  if (!token) return NextResponse.json({ error: "Session expired" }, { status: 401 });

  let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(playlistId)}&maxResults=50`;
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return NextResponse.json({ error: "YouTube API error" }, { status: res.status });
  return NextResponse.json(await res.json());
}
