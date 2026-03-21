import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("yt_session", "", { maxAge: 0, path: "/" });
  return res;
}
