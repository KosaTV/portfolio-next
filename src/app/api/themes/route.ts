import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "custom-themes.json");

const BUILTIN_IDS = ["cyber", "crimson", "violet", "matrix", "arctic", "amber"];

interface ThemeData {
  id: string;
  name: string;
  primary: string;
  secondary: string;
}

interface StoredData {
  themes: Record<string, ThemeData>;
  activeTheme: string;
}

function readData(): StoredData {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { themes: {}, activeTheme: "cyber" };
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
  const { id, name, primary, secondary } = body as ThemeData;

  if (!id || !name || !primary || !secondary) {
    return NextResponse.json({ error: "Missing fields: id, name, primary, secondary" }, { status: 400 });
  }

  if (BUILTIN_IDS.includes(id)) {
    return NextResponse.json({ error: `Cannot overwrite built-in theme "${id}"` }, { status: 400 });
  }

  if (!HEX_RE.test(primary) || !HEX_RE.test(secondary)) {
    return NextResponse.json({ error: "Colors must be in #RRGGBB hex format" }, { status: 400 });
  }

  const data = readData();
  data.themes[id] = { id, name, primary, secondary };
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
  const { activeTheme } = body as { activeTheme: string };

  if (!activeTheme) {
    return NextResponse.json({ error: "Missing field: activeTheme" }, { status: 400 });
  }

  const data = readData();

  if (!BUILTIN_IDS.includes(activeTheme) && !data.themes[activeTheme]) {
    return NextResponse.json({ error: `Theme "${activeTheme}" not found` }, { status: 404 });
  }

  data.activeTheme = activeTheme;
  writeData(data);

  return NextResponse.json({ success: true, activeTheme });
}
