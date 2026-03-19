import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "custom-themes.json");

const BUILTIN_IDS = ["cyber", "crimson", "violet", "matrix", "arctic", "amber"];

const WALLPAPER_PRESETS = ["grid", "diagonal", "radial", "columns", "aurora", "circles", "none"];

interface ThemeData {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  wallpaper?: string;
}

interface StoredData {
  themes: Record<string, ThemeData>;
  activeTheme: string;
  activeWallpaper: string;
}

function readData(): StoredData {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { activeWallpaper: "grid", ...parsed };
  } catch {
    return { themes: {}, activeTheme: "cyber", activeWallpaper: "grid" };
  }
}

function writeData(data: StoredData) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function GET() {
  const data = readData();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { id, name, primary, secondary, wallpaper } = body as ThemeData;

  if (!id || !name || !primary || !secondary) {
    return NextResponse.json({ error: "Missing fields: id, name, primary, secondary" }, { status: 400 });
  }

  if (BUILTIN_IDS.includes(id)) {
    return NextResponse.json({ error: `Cannot overwrite built-in theme "${id}"` }, { status: 400 });
  }

  if (!HEX_RE.test(primary) || !HEX_RE.test(secondary)) {
    return NextResponse.json({ error: "Colors must be in #RRGGBB hex format" }, { status: 400 });
  }

  const wp = wallpaper && WALLPAPER_PRESETS.includes(wallpaper) ? wallpaper : "grid";

  const data = readData();
  data.themes[id] = { id, name, primary, secondary, wallpaper: wp };
  writeData(data);

  return NextResponse.json({ success: true, theme: data.themes[id] });
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const { id } = body as { id: string };

  if (!id) {
    return NextResponse.json({ error: "Missing field: id" }, { status: 400 });
  }

  if (BUILTIN_IDS.includes(id)) {
    return NextResponse.json({ error: `Cannot delete built-in theme "${id}"` }, { status: 400 });
  }

  const data = readData();

  if (!data.themes[id]) {
    return NextResponse.json({ error: `Theme "${id}" not found` }, { status: 404 });
  }

  delete data.themes[id];

  if (data.activeTheme === id) {
    data.activeTheme = "cyber";
  }

  writeData(data);
  return NextResponse.json({ success: true, activeTheme: data.activeTheme });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const { activeTheme, activeWallpaper } = body as { activeTheme?: string; activeWallpaper?: string };

  if (!activeTheme && !activeWallpaper) {
    return NextResponse.json({ error: "Missing field: activeTheme or activeWallpaper" }, { status: 400 });
  }

  const data = readData();

  if (activeTheme) {
    if (!BUILTIN_IDS.includes(activeTheme) && !data.themes[activeTheme]) {
      return NextResponse.json({ error: `Theme "${activeTheme}" not found` }, { status: 404 });
    }
    data.activeTheme = activeTheme;
  }

  if (activeWallpaper) {
    if (!WALLPAPER_PRESETS.includes(activeWallpaper)) {
      return NextResponse.json({ error: `Invalid wallpaper preset "${activeWallpaper}"` }, { status: 400 });
    }
    data.activeWallpaper = activeWallpaper;
  }

  writeData(data);

  return NextResponse.json({ success: true, activeTheme: data.activeTheme, activeWallpaper: data.activeWallpaper });
}
