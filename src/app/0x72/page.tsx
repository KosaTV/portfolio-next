"use client";

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

type AppId = "terminal" | "files" | "monitor" | "about" | "notepad" | "visitors";
type ThemeId = string;

interface WallpaperConfig {
  background: string;
  backgroundSize?: string;
}

interface OSTheme {
  name: string;
  primary: string;
  secondary: string;
  primaryRgb: string;
  secondaryRgb: string;
  wallpaper?: string; // preset name, only if theme explicitly sets one
}

// ─── Themes ─────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const BUILTIN_THEME_IDS = ["cyber", "crimson", "violet", "matrix", "arctic", "amber"] as const;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const WALLPAPER_PRESETS: Record<string, { label: string; generate: (rgb: string) => WallpaperConfig }> = {
  grid: {
    label: "Grid lines",
    generate: (rgb) => ({
      background: `linear-gradient(rgba(${rgb},0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(${rgb},0.015) 1px, transparent 1px)`,
      backgroundSize: "48px 48px",
    }),
  },
  diagonal: {
    label: "Diagonal stripes",
    generate: (rgb) => ({
      background: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(${rgb},0.03) 20px, rgba(${rgb},0.03) 40px)`,
    }),
  },
  radial: {
    label: "Center glow",
    generate: (rgb) => ({
      background: `radial-gradient(ellipse at 50% 50%, rgba(${rgb},0.06) 0%, transparent 70%)`,
    }),
  },
  columns: {
    label: "Vertical columns",
    generate: (rgb) => ({
      background: `repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(${rgb},0.02) 30px, rgba(${rgb},0.02) 31px)`,
    }),
  },
  aurora: {
    label: "Horizontal bands",
    generate: (rgb) => ({
      background: `linear-gradient(180deg, rgba(${rgb},0.04) 0%, transparent 30%, rgba(${rgb},0.03) 60%, transparent 100%)`,
    }),
  },
  circles: {
    label: "Concentric circles",
    generate: (rgb) => ({
      background: `repeating-radial-gradient(circle at 50% 50%, transparent, transparent 40px, rgba(${rgb},0.02) 40px, rgba(${rgb},0.02) 41px)`,
    }),
  },
  none: {
    label: "Plain background",
    generate: () => ({ background: "none" }),
  },
};

const WALLPAPER_KEYS = Object.keys(WALLPAPER_PRESETS);

const THEMES: Record<string, OSTheme> = {
  cyber:   { name: "Cyber",   primary: "#00f0d4", secondary: "#f0a500", primaryRgb: "0,240,212",   secondaryRgb: "240,165,0" },
  crimson: { name: "Crimson", primary: "#ff3366", secondary: "#ffd700", primaryRgb: "255,51,102",  secondaryRgb: "255,215,0" },
  violet:  { name: "Violet",  primary: "#b366ff", secondary: "#ff66b2", primaryRgb: "179,102,255", secondaryRgb: "255,102,178" },
  matrix:  { name: "Matrix",  primary: "#00ff41", secondary: "#adff2f", primaryRgb: "0,255,65",    secondaryRgb: "173,255,47" },
  arctic:  { name: "Arctic",  primary: "#66ccff", secondary: "#a0d4ff", primaryRgb: "102,204,255", secondaryRgb: "160,212,255" },
  amber:   { name: "Amber",   primary: "#f0a500", secondary: "#ff6b35", primaryRgb: "240,165,0",   secondaryRgb: "255,107,53" },
};

const ThemeContext = createContext<{
  theme: OSTheme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  allThemes: Record<string, OSTheme>;
  customThemeIds: string[];
  reloadThemes: () => Promise<void>;
  wallpaper: WallpaperConfig;
  wallpaperPreset: string;
  setWallpaper: (preset: string) => void;
}>({
  theme: THEMES.cyber,
  themeId: "cyber",
  setThemeId: () => {},
  allThemes: THEMES,
  customThemeIds: [],
  reloadThemes: async () => {},
  wallpaper: WALLPAPER_PRESETS.grid.generate("0,240,212"),
  wallpaperPreset: "grid",
  setWallpaper: () => {},
});

interface WindowState {
  id: string;
  app: AppId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  zIndex: number;
  preMaximized?: { x: number; y: number; w: number; h: number };
  closing?: boolean;
  minimizing?: boolean;
  restoring?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const APPS: Record<AppId, { label: string; icon: string }> = {
  terminal: { label: "Terminal", icon: ">_" },
  files: { label: "Files", icon: "📁" },
  monitor: { label: "System Monitor", icon: "📊" },
  about: { label: "About JC OS", icon: "ℹ" },
  notepad: { label: "Notepad", icon: "📝" },
  visitors: { label: "Visitors", icon: "👁" },
};

const DESKTOP_ICONS: { app: AppId; x: number; y: number }[] = [
  { app: "terminal", x: 24, y: 24 },
  { app: "files", x: 24, y: 120 },
  { app: "monitor", x: 24, y: 216 },
  { app: "about", x: 24, y: 312 },
  { app: "notepad", x: 24, y: 408 },
  { app: "visitors", x: 24, y: 504 },
];

// ─── Fake filesystem ─────────────────────────────────────────────────────────

type FSEntry = { type: "file"; content: string } | { type: "dir"; children: Record<string, FSEntry> };

const FILESYSTEM: Record<string, FSEntry> = {
  "about.txt": {
    type: "file",
    content: `╔══════════════════════════════════════╗
║         JACOB CHODUBSKI              ║
║         Software Engineer            ║
╚══════════════════════════════════════╝

Full-stack developer who loves building
things that live on the internet.

Stack: React, Next.js, Node.js, Three.js
Location: Poland
Coffee: Always`,
  },
  "projects": {
    type: "dir",
    children: {
      "portfolio-v2.md": {
        type: "file",
        content: "# Portfolio v2\nThe very site you're looking at.\nBuilt with Next.js, Tailwind, Three.js.",
      },
      "secret-plans.txt": {
        type: "file",
        content: "Nice try. 😏\n\nBut since you're here...\nStay curious. That's how the best devs are made.",
      },
    },
  },
  "skills.json": {
    type: "file",
    content: `{
  "frontend": ["React", "Next.js", "TypeScript", "Tailwind"],
  "backend": ["Node.js", "Express", "PostgreSQL"],
  "tools": ["Git", "Docker", "Linux", "VS Code"],
  "soft": ["Problem Solving", "Creativity", "Coffee Drinking"]
}`,
  },
  ".bashrc": {
    type: "file",
    content: `# JC OS .bashrc
export PS1="root@jc-os:~$ "
alias ll="ls -la"
alias cls="clear"
# echo "Welcome back, root."`,
  },
  "music": {
    type: "dir",
    children: {
      "lofi-beats.mp3": { type: "file", content: "[Binary audio data — just kidding, imagine lofi beats playing]" },
      "keyboard-asmr.wav": { type: "file", content: "[The sound of mechanical keyboards at 3 AM]" },
    },
  },
  "notes.txt": {
    type: "file",
    content: "TODO:\n- Ship portfolio v2 ✓\n- Add secret OS easter egg ✓\n- Touch grass\n- Sleep (optional)",
  },
};

// ─── Helper: resolve path in filesystem ──────────────────────────────────────

function resolvePath(path: string[]): { entries: Record<string, FSEntry> } | null {
  let current: Record<string, FSEntry> = FILESYSTEM;
  for (const segment of path) {
    const entry = current[segment];
    if (!entry || entry.type !== "dir") return null;
    current = entry.children;
  }
  return { entries: current };
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SysPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [topZ, setTopZ] = useState(10);
  const [booted, setBooted] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const desktopRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<{ startX: number; startY: number } | null>(null);
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectedIcons, setSelectedIcons] = useState<Set<AppId>>(new Set());
  const [themeId, setThemeIdRaw] = useState<ThemeId>("cyber");
  const [customThemes, setCustomThemes] = useState<Record<string, OSTheme>>({});
  const [wallpaperPreset, setWallpaperPresetRaw] = useState("grid");

  const allThemes: Record<string, OSTheme> = { ...THEMES, ...customThemes };
  const theme = allThemes[themeId] || THEMES.cyber;
  const customThemeIds = Object.keys(customThemes);
  const wallpaper = WALLPAPER_PRESETS[wallpaperPreset]?.generate(theme.primaryRgb) || WALLPAPER_PRESETS.grid.generate(theme.primaryRgb);

  const reloadThemes = useCallback(async () => {
    const res = await fetch("/api/themes");
    const data: { themes: Record<string, { id: string; name: string; primary: string; secondary: string; wallpaper?: string }>; activeTheme: string; activeWallpaper?: string } = await res.json();
    const custom: Record<string, OSTheme> = {};
    for (const [id, t] of Object.entries(data.themes)) {
      custom[id] = {
        name: t.name,
        primary: t.primary,
        secondary: t.secondary,
        primaryRgb: hexToRgb(t.primary),
        secondaryRgb: hexToRgb(t.secondary),
        wallpaper: t.wallpaper,
      };
    }
    setCustomThemes(custom);
    if (data.activeTheme && (data.activeTheme in THEMES || data.activeTheme in custom)) {
      setThemeIdRaw(data.activeTheme);
    }
    if (data.activeWallpaper && WALLPAPER_PRESETS[data.activeWallpaper]) {
      setWallpaperPresetRaw(data.activeWallpaper);
    }
  }, []);

  const setWallpaper = useCallback((preset: string) => {
    setWallpaperPresetRaw(preset);
    fetch("/api/themes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeWallpaper: preset }),
    }).catch(() => {});
  }, []);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdRaw(id);
    const t = { ...THEMES, ...customThemes }[id];
    const patch: Record<string, string> = { activeTheme: id };
    // If the theme has an explicit wallpaper, apply it
    if (t?.wallpaper && WALLPAPER_PRESETS[t.wallpaper]) {
      setWallpaperPresetRaw(t.wallpaper);
      patch.activeWallpaper = t.wallpaper;
    }
    fetch("/api/themes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }, [customThemes]);

  // Load persisted themes + active theme after auth
  useEffect(() => {
    if (!authed) return;
    reloadThemes().catch(() => {});
  }, [authed, reloadThemes]);

  // Verify JWT on load
  useEffect(() => {
    fetch("/api/auth/verify")
      .then((res) => {
        if (!res.ok) throw new Error();
        setAuthed(true);
      })
      .catch(() => router.replace("/"));
  }, [router]);

  // Boot sequence — only after auth
  useEffect(() => {
    if (!authed) return;
    const lines = [
      "JC OS v1.0 — kernel loading...",
      "Mounting /dev/portfolio...",
      "Loading desktop environment...",
      "Starting window manager...",
      "✓ System ready.",
    ];
    lines.forEach((line, i) => {
      setTimeout(() => setBootLines((prev) => [...prev, line]), i * 400);
    });
    setTimeout(() => setBooted(true), lines.length * 400 + 300);
  }, [authed]);

  const fullscreenTriggered = useRef(false);
  const handleFirstInteraction = () => {
    if (fullscreenTriggered.current) return;
    fullscreenTriggered.current = true;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const openApp = useCallback(
    (app: AppId) => {
      const id = `${app}-${Date.now()}`;
      const newZ = topZ + 1;
      setTopZ(newZ);
      setWindows((prev) => [
        ...prev,
        {
          id,
          app,
          title: APPS[app].label,
          x: 120 + Math.random() * 200,
          y: 60 + Math.random() * 100,
          w: app === "terminal" ? 600 : app === "monitor" ? 500 : app === "about" ? 420 : 520,
          h: app === "terminal" ? 380 : app === "monitor" ? 400 : app === "about" ? 340 : 380,
          minimized: false,
          maximized: false,
          zIndex: newZ,
        },
      ]);
    },
    [topZ]
  );

  // Alt+T opens terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "t") {
        e.preventDefault();
        openApp("terminal");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openApp]);

  const closeWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, closing: true } : w)));
    setTimeout(() => setWindows((prev) => prev.filter((w) => w.id !== id)), 150);
  };

  const minimizeWindow = (id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimizing: true } : w)));
    setTimeout(() => setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true, minimizing: false } : w))), 350);
  };

  const toggleMaximize = (id: string) =>
    setWindows((prev) => prev.map((w) => {
      if (w.id !== id) return w;
      if (w.maximized) {
        const pre = w.preMaximized || { x: 120, y: 60, w: 600, h: 380 };
        return { ...w, maximized: false, x: pre.x, y: pre.y, w: pre.w, h: pre.h, preMaximized: undefined };
      }
      return { ...w, maximized: true, preMaximized: { x: w.x, y: w.y, w: w.w, h: w.h }, x: 0, y: 0, w: window.innerWidth, h: window.innerHeight - 40 };
    }));

  const focusWindow = (id: string) => {
    const newZ = topZ + 1;
    setTopZ(newZ);
    const wasMinimized = windows.find((w) => w.id === id)?.minimized;
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.minimized) {
          return { ...w, zIndex: newZ, minimized: false, restoring: true };
        }
        return { ...w, zIndex: newZ };
      })
    );
    if (wasMinimized) {
      setTimeout(() => setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, restoring: false } : w))), 350);
    }
  };

  const updateWindow = (id: string, updates: Partial<WindowState>) =>
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));

  // Desktop selection rectangle
  const handleDesktopMouseDown = (e: React.MouseEvent) => {
    // Only start selection if clicking directly on the desktop background
    if (e.target !== desktopRef.current) return;
    selectionRef.current = { startX: e.clientX, startY: e.clientY };
    setSelection(null);
    setSelectedIcons(new Set());
  };

  // Check which icons overlap with the selection rectangle
  const getSelectedIcons = useCallback((sel: { x: number; y: number; w: number; h: number }) => {
    const desktopEl = desktopRef.current;
    if (!desktopEl) return new Set<AppId>();

    const desktopRect = desktopEl.getBoundingClientRect();
    const selected = new Set<AppId>();

    // Icon button dimensions: p-2 (8px padding), w-12 h-12 icon + label ≈ 80x80
    const ICON_W = 80;
    const ICON_H = 80;

    for (const icon of DESKTOP_ICONS) {
      const iconLeft = desktopRect.left + icon.x;
      const iconTop = desktopRect.top + icon.y;
      const iconRight = iconLeft + ICON_W;
      const iconBottom = iconTop + ICON_H;

      const selRight = sel.x + sel.w;
      const selBottom = sel.y + sel.h;

      // Check rectangle overlap
      if (sel.x < iconRight && selRight > iconLeft && sel.y < iconBottom && selBottom > iconTop) {
        selected.add(icon.app);
      }
    }
    return selected;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!selectionRef.current) return;
      const { startX, startY } = selectionRef.current;
      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      if (w > 3 || h > 3) {
        const sel = { x, y, w, h };
        setSelection(sel);
        setSelectedIcons(getSelectedIcons(sel));
      }
    };
    const handleMouseUp = () => {
      selectionRef.current = null;
      setSelection(null);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [getSelectedIcons]);

  // Waiting for auth
  if (!authed) {
    return <div className="fixed inset-0" style={{ background: "#020202" }} />;
  }

  // Boot screen
  if (!booted) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ background: "#020202", fontFamily: "'JetBrains Mono', monospace" }}
      >
        <div className="w-full max-w-md px-8">
          <div className="text-xs space-y-1" style={{ color: theme.primary }}>
            {bootLines.map((line, i) => (
              <div
                key={i}
                style={{
                  color: line.startsWith("✓") ? theme.primary : "#555",
                  textShadow: line.startsWith("✓") ? `0 0 8px rgba(${theme.primaryRgb},0.4)` : "none",
                }}
              >
                {line}
              </div>
            ))}
            <span
              className="inline-block w-[7px] h-[13px]"
              style={{ backgroundColor: theme.primary, animation: "blink 1s step-end infinite" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, themeId, setThemeId, allThemes, customThemeIds, reloadThemes, wallpaper, wallpaperPreset, setWallpaper }}>
      <div
        className="fixed inset-0 overflow-hidden select-none"
        style={{
          background: "#0a0a0a",
          fontFamily: "'JetBrains Mono', monospace",
          backgroundImage: wallpaper.background,
          backgroundSize: wallpaper.backgroundSize || undefined,
        }}
        onMouseDown={handleFirstInteraction}
        onKeyDown={handleFirstInteraction}
      >
        {/* Scanlines */}
        <div
          className="fixed inset-0 pointer-events-none z-[9999]"
          style={{
            backgroundImage:
              `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(${theme.primaryRgb},0.02) 2px, rgba(${theme.primaryRgb},0.02) 4px)`,
          }}
        />

        {/* Selection rectangle */}
        {selection && (
          <div
            className="fixed pointer-events-none z-[9997]"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.w,
              height: selection.h,
              border: `1px solid rgba(${theme.primaryRgb},0.5)`,
              backgroundColor: `rgba(${theme.primaryRgb},0.06)`,
              boxShadow: `0 0 8px rgba(${theme.primaryRgb},0.1), inset 0 0 8px rgba(${theme.primaryRgb},0.03)`,
            }}
          />
        )}

        {/* Desktop area */}
        <div ref={desktopRef} className="absolute inset-0 pb-12" onMouseDown={handleDesktopMouseDown}>
          {/* Desktop icons */}
          {DESKTOP_ICONS.map(({ app, x, y }) => {
            const isSelected = selectedIcons.has(app);
            return (
              <button
                key={app}
                className="absolute flex flex-col items-center gap-1.5 p-2 rounded transition-colors cursor-pointer hover:bg-white/5"
                style={{
                  left: x,
                  top: y,
                  backgroundColor: isSelected ? `rgba(${theme.primaryRgb},0.1)` : undefined,
                }}
                onDoubleClick={() => openApp(app)}
                onClick={() => setSelectedIcons(new Set([app]))}
              >
                <div
                  className="w-12 h-12 flex items-center justify-center border bg-[#0f0f0f] text-lg"
                  style={{
                    color: app === "terminal" ? theme.primary : app === "monitor" ? theme.secondary : "#888",
                    boxShadow: isSelected
                      ? `0 0 12px rgba(${theme.primaryRgb},0.2)`
                      : app === "terminal"
                      ? `0 0 12px rgba(${theme.primaryRgb},0.1)`
                      : "none",
                    borderColor: isSelected ? `rgba(${theme.primaryRgb},0.4)` : "#1a1a1a",
                  }}
                >
                  {APPS[app].icon}
                </div>
                <span
                  className="text-[10px] text-center leading-tight w-16"
                  style={{ color: isSelected ? theme.primary : "#888" }}
                >
                  {APPS[app].label}
                </span>
              </button>
            );
          })}

          {/* Windows */}
          {windows.map(
            (win) =>
              !win.minimized && (
                <Window
                  key={win.id}
                  win={win}
                  onClose={() => closeWindow(win.id)}
                  onMinimize={() => minimizeWindow(win.id)}
                  onToggleMaximize={() => toggleMaximize(win.id)}
                  onFocus={() => focusWindow(win.id)}
                  onMove={(x, y) => updateWindow(win.id, { x, y, maximized: false })}
                  onResize={(w, h, x, y) => updateWindow(win.id, { w, h, maximized: false, ...(x !== undefined && { x }), ...(y !== undefined && { y }) })}
                  onSnap={(snap) => updateWindow(win.id, { ...snap, maximized: snap.y === 0 && snap.x === 0 && snap.w === window.innerWidth, preMaximized: { x: win.x, y: win.y, w: win.w, h: win.h } })}
                />
              )
          )}
        </div>

        {/* Taskbar */}
        <Taskbar windows={windows} onFocus={focusWindow} onOpen={openApp} />
      </div>
    </ThemeContext.Provider>
  );
}

// ─── Window Component ────────────────────────────────────────────────────────

type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type SnapZone = "top" | "left" | "right" | null;

const SNAP_THRESHOLD = 8;
const TASKBAR_H = 40;

const getSnapZone = (e: MouseEvent): SnapZone => {
  if (e.clientY <= SNAP_THRESHOLD) return "top";
  if (e.clientX <= SNAP_THRESHOLD) return "left";
  if (e.clientX >= window.innerWidth - SNAP_THRESHOLD) return "right";
  return null;
};

const getSnapRect = (zone: SnapZone) => {
  const h = window.innerHeight - TASKBAR_H;
  if (zone === "top") return { x: 0, y: 0, w: window.innerWidth, h };
  if (zone === "left") return { x: 0, y: 0, w: Math.floor(window.innerWidth / 2), h };
  if (zone === "right") return { x: Math.floor(window.innerWidth / 2), y: 0, w: Math.floor(window.innerWidth / 2), h };
  return null;
};

function Window({
  win,
  onClose,
  onMinimize,
  onToggleMaximize,
  onFocus,
  onMove,
  onResize,
  onSnap,
}: {
  win: WindowState;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number, x?: number, y?: number) => void;
  onSnap: (snap: { x: number; y: number; w: number; h: number }) => void;
}) {
  const { theme } = useContext(ThemeContext);
  const windowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; edge: ResizeEdge } | null>(null);

  // Calculate transform to move window center to taskbar button
  const getMinimizeTransform = useCallback(() => {
    const btn = document.querySelector(`[data-taskbar-id="${win.id}"]`);
    if (!btn || !windowRef.current) return "scale(0.2) translateY(100vh)";
    const btnRect = btn.getBoundingClientRect();
    const btnCX = btnRect.left + btnRect.width / 2;
    const btnCY = btnRect.top + btnRect.height / 2;
    const winCX = win.x + win.w / 2;
    const winCY = win.y + win.h / 2;
    const dx = btnCX - winCX;
    const dy = btnCY - winCY;
    return `translate(${dx}px, ${dy}px) scale(0.05)`;
  }, [win.id, win.x, win.y, win.w, win.h]);

  const [minimizeTransform, setMinimizeTransform] = useState<string | null>(null);

  useEffect(() => {
    if (win.minimizing) {
      setMinimizeTransform(getMinimizeTransform());
    } else if (win.restoring) {
      setMinimizeTransform(getMinimizeTransform());
      requestAnimationFrame(() => requestAnimationFrame(() => setMinimizeTransform(null)));
    } else {
      setMinimizeTransform(null);
    }
  }, [win.minimizing, win.restoring, getMinimizeTransform]);

  const [snapZone, setSnapZone] = useState<SnapZone>(null);
  const snapZoneRef = useRef<SnapZone>(null);

  useEffect(() => {
    snapZoneRef.current = snapZone;
  }, [snapZone]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;

        // Unsnap after a small movement threshold
        if (unsnapPending.current && (Math.abs(dx) > 30 || Math.abs(dy) > 30)) {
          unsnapPending.current = false;
          const pre = win.preMaximized!;
          const newX = e.clientX - pre.w / 2;
          const newY = e.clientY - 15;
          dragRef.current = { startX: e.clientX, startY: e.clientY, origX: newX, origY: newY };
          onResize(pre.w, pre.h, newX, newY);
          return;
        }

        if (!unsnapPending.current) {
          onMove(dragRef.current.origX + dx, dragRef.current.origY + dy);
          setSnapZone(getSnapZone(e));
        }
      }
      if (resizeRef.current) {
        const r = resizeRef.current;
        const dx = e.clientX - r.startX;
        const dy = e.clientY - r.startY;
        let newX = r.origX, newY = r.origY, newW = r.origW, newH = r.origH;

        if (r.edge.includes("e")) newW = Math.max(300, r.origW + dx);
        if (r.edge.includes("s")) newH = Math.max(200, r.origH + dy);
        if (r.edge.includes("w")) {
          newW = Math.max(300, r.origW - dx);
          newX = r.origX + r.origW - newW;
        }
        if (r.edge.includes("n")) {
          newH = Math.max(200, r.origH - dy);
          newY = r.origY + r.origH - newH;
        }

        onResize(newW, newH, newX, newY);
      }
    };
    const handleMouseUp = () => {
      if (dragRef.current && snapZoneRef.current) {
        const rect = getSnapRect(snapZoneRef.current);
        if (rect) onSnap(rect);
      }
      dragRef.current = null;
      resizeRef.current = null;
      unsnapPending.current = false;
      setDragging(false);
      setSnapZone(null);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onMove, onResize, onSnap]);

  const unsnapPending = useRef(false);

  const startDrag = (e: React.MouseEvent) => {
    onFocus();
    setDragging(true);
    lastSnapZone.current = null;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: win.x, origY: win.y };
    unsnapPending.current = !!win.preMaximized;
  };

  const startResize = (edge: ResizeEdge) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocus();
    setDragging(true);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, origX: win.x, origY: win.y, origW: win.w, origH: win.h, edge };
  };

  const [dragging, setDragging] = useState(false);

  const snapRect = snapZone ? getSnapRect(snapZone) : null;

  // Track last snap zone so the hide animation goes back to where it came from
  const lastSnapZone = useRef<SnapZone>(null);
  useEffect(() => {
    if (snapZone) lastSnapZone.current = snapZone;
  }, [snapZone]);

  // Compute collapsed position based on which edge triggered
  const collapseZone = snapZone || lastSnapZone.current;
  const collapseRect = collapseZone ? getSnapRect(collapseZone) : null;
  const hiddenStyle = collapseRect ? {
    left: collapseZone === "right" ? collapseRect.x + collapseRect.w : collapseRect.x,
    top: collapseRect.y,
    width: collapseZone === "left" || collapseZone === "right" ? 0 : collapseRect.w,
    height: collapseZone === "top" ? 0 : collapseRect.h,
  } : { left: 0, top: 0, width: 0, height: 0 };

  return (
    <>
    <div
      className="fixed pointer-events-none z-[9996]"
      style={{
        left: snapRect ? snapRect.x + 4 : hiddenStyle.left,
        top: snapRect ? snapRect.y + 4 : hiddenStyle.top,
        width: snapRect ? snapRect.w - 8 : hiddenStyle.width,
        height: snapRect ? snapRect.h - 8 : hiddenStyle.height,
        border: `2px solid rgba(${theme.primaryRgb},0.4)`,
        backgroundColor: `rgba(${theme.primaryRgb},0.06)`,
        borderRadius: 4,
        opacity: snapRect ? 1 : 0,
        transition: "all 0.2s ease",
      }}
    />
    <div
      ref={windowRef}
      className="absolute flex flex-col"
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.zIndex,
        ...(win.minimizing || win.restoring
          ? {
              transform: minimizeTransform || "none",
              opacity: minimizeTransform ? 0 : 1,
              transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              pointerEvents: "none" as const,
            }
          : {
              animation: win.closing ? "windowClose 0.15s ease forwards" : "windowOpen 0.15s ease",
              transition: dragging ? "none" : "left 0.2s ease, top 0.2s ease, width 0.2s ease, height 0.2s ease",
            }),
      }}
      onMouseDown={onFocus}
    >
      <div
        className="border border-[#1a1a1a] bg-[#0a0a0a] flex flex-col h-full overflow-hidden"
        style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 1px rgba(${theme.primaryRgb},0.1)` }}
      >
        {/* Title bar */}
        <div
          className="flex items-center gap-2 px-3 py-2 bg-[#0f0f0f] border-b border-[#1a1a1a] shrink-0 cursor-grab active:cursor-grabbing"
          onMouseDown={startDrag}
          onDoubleClick={onToggleMaximize}
        >
          <button
            onClick={onClose}
            className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] hover:brightness-125 transition cursor-pointer"
          />
          <button
            onClick={onMinimize}
            className="w-2.5 h-2.5 rounded-full bg-[#febc2e] hover:brightness-125 transition cursor-pointer"
          />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-[10px] text-[#555] tracking-wider">{win.title}</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {win.app === "terminal" && <TerminalApp onExit={onClose} />}
          {win.app === "files" && <FilesApp />}
          {win.app === "monitor" && <MonitorApp />}
          {win.app === "about" && <AboutApp />}
          {win.app === "notepad" && <NotepadApp />}
          {win.app === "visitors" && <VisitorsApp />}
        </div>
      </div>

      {/* Resize edges */}
      <div className="absolute top-0 left-[5px] right-[5px] h-[5px] cursor-n-resize" onMouseDown={startResize("n")} />
      <div className="absolute bottom-0 left-[5px] right-[5px] h-[5px] cursor-s-resize" onMouseDown={startResize("s")} />
      <div className="absolute left-0 top-[5px] bottom-[5px] w-[5px] cursor-w-resize" onMouseDown={startResize("w")} />
      <div className="absolute right-0 top-[5px] bottom-[5px] w-[5px] cursor-e-resize" onMouseDown={startResize("e")} />
      {/* Resize corners */}
      <div className="absolute top-0 left-0 w-[5px] h-[5px] cursor-nw-resize" onMouseDown={startResize("nw")} />
      <div className="absolute top-0 right-0 w-[5px] h-[5px] cursor-ne-resize" onMouseDown={startResize("ne")} />
      <div className="absolute bottom-0 left-0 w-[5px] h-[5px] cursor-sw-resize" onMouseDown={startResize("sw")} />
      <div className="absolute bottom-0 right-0 w-[5px] h-[5px] cursor-se-resize" onMouseDown={startResize("se")} />
    </div>
    </>
  );
}

// ─── Terminal App ────────────────────────────────────────────────────────────

function TerminalApp({ onExit }: { onExit: () => void }) {
  const { theme, themeId: activeThemeId, setThemeId, allThemes, customThemeIds, reloadThemes, wallpaperPreset: activeWallpaper, setWallpaper } = useContext(ThemeContext);
  const [history, setHistory] = useState<{ text: string; color: string }[]>([
    { text: "JC OS Terminal v1.0", color: "#555" },
    { text: 'Type "help" for commands.\n', color: "#555" },
  ]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Wizard state for theme creation
  const [wizardStep, setWizardStep] = useState(0); // 0=idle, 1=name, 2=primary, 3=secondary, 4=wallpaper
  const wizardData = useRef<{ name: string; primary: string; secondary: string; wallpaper: string }>({ name: "", primary: "", secondary: "", wallpaper: "grid" });

  const handleWizardInput = (value: string) => {
    const trimmed = value.trim();
    const addLines = (lines: { text: string; color: string }[]) =>
      setHistory((prev) => [...prev, ...lines]);

    if (wizardStep === 1) {
      if (!trimmed) {
        addLines([{ text: "Name cannot be empty. Enter theme name:", color: "#ff5f57" }]);
        return;
      }
      const id = trimmed.toLowerCase().replace(/\s+/g, "-");
      if (BUILTIN_THEME_IDS.includes(id as typeof BUILTIN_THEME_IDS[number])) {
        addLines([{ text: `"${trimmed}" conflicts with a built-in theme. Choose another name:`, color: "#ff5f57" }]);
        return;
      }
      wizardData.current.name = trimmed;
      addLines([
        { text: `  Name: ${trimmed}`, color: "#888" },
        { text: "Enter primary color (hex, e.g. #ff6600):", color: theme.primary },
      ]);
      setWizardStep(2);
      return;
    }

    if (wizardStep === 2) {
      if (!HEX_RE.test(trimmed)) {
        addLines([{ text: `Invalid hex color "${trimmed}". Use format #RRGGBB:`, color: "#ff5f57" }]);
        return;
      }
      wizardData.current.primary = trimmed;
      addLines([
        { text: `  Primary: ${trimmed}`, color: trimmed },
        { text: "Enter secondary color (hex, e.g. #00ccff):", color: theme.primary },
      ]);
      setWizardStep(3);
      return;
    }

    if (wizardStep === 3) {
      if (!HEX_RE.test(trimmed)) {
        addLines([{ text: `Invalid hex color "${trimmed}". Use format #RRGGBB:`, color: "#ff5f57" }]);
        return;
      }
      wizardData.current.secondary = trimmed;
      const wallpaperOptions = WALLPAPER_KEYS.map((k, i) =>
        `  ${i + 1}. ${k.padEnd(10)} — ${WALLPAPER_PRESETS[k].label}`
      );
      addLines([
        { text: `  Secondary: ${trimmed}`, color: trimmed },
        { text: "Select wallpaper (enter number or name):", color: theme.primary },
        ...wallpaperOptions.map((t) => ({ text: t, color: "#888" })),
      ]);
      setWizardStep(4);
      return;
    }

    if (wizardStep === 4) {
      // Accept by number (1-based) or by name
      const num = parseInt(trimmed, 10);
      let preset: string | undefined;
      if (num >= 1 && num <= WALLPAPER_KEYS.length) {
        preset = WALLPAPER_KEYS[num - 1];
      } else if (WALLPAPER_PRESETS[trimmed.toLowerCase()]) {
        preset = trimmed.toLowerCase();
      }

      if (!preset) {
        addLines([{ text: `Invalid selection "${trimmed}". Enter a number (1-${WALLPAPER_KEYS.length}) or preset name:`, color: "#ff5f57" }]);
        return;
      }

      wizardData.current.wallpaper = preset;
      addLines([{ text: `  Wallpaper: ${preset}`, color: "#888" }]);

      const { name, primary, secondary, wallpaper } = wizardData.current;
      const id = name.toLowerCase().replace(/\s+/g, "-");

      fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name, primary, secondary, wallpaper }),
      })
        .then((res) => res.json())
        .then(async (data) => {
          if (data.error) {
            setHistory((prev) => [...prev, { text: `Error: ${data.error}`, color: "#ff5f57" }]);
          } else {
            await reloadThemes();
            setHistory((prev) => [
              ...prev,
              { text: `\n✓ Theme "${name}" created! Use "theme ${id}" to switch.`, color: primary },
            ]);
          }
        })
        .catch(() => {
          setHistory((prev) => [...prev, { text: "Error: Failed to create theme.", color: "#ff5f57" }]);
        });

      setWizardStep(0);
      return;
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [history]);

  const prompt = `root@jc-os:~${cwd.length ? "/" + cwd.join("/") : ""}$ `;

  const run = (cmd: string) => {
    const parts = cmd.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    const add = (lines: { text: string; color: string }[]) =>
      setHistory((prev) => [...prev, { text: prompt + cmd, color: theme.primary }, ...lines]);

    if (!command) return;

    if (command === "help") {
      add([
        { text: "Available commands:", color: theme.secondary },
        { text: "  ls          — list files", color: "#888" },
        { text: "  cd <dir>    — change directory", color: "#888" },
        { text: "  cat <file>  — read a file", color: "#888" },
        { text: "  pwd         — current directory", color: "#888" },
        { text: "  whoami      — who are you", color: "#888" },
        { text: "  neofetch    — system info", color: "#888" },
        { text: "  themes      — list available themes", color: "#888" },
        { text: "  theme <n>   — switch theme", color: "#888" },
        { text: "  theme create — create a custom theme", color: "#888" },
        { text: "  theme delete <n> — delete a custom theme", color: "#888" },
        { text: "  wallpapers  — list wallpaper presets", color: "#888" },
        { text: "  wallpaper <n> — change wallpaper", color: "#888" },
        { text: "  clear       — clear screen", color: "#888" },
        { text: "  exit        — close terminal", color: "#888" },
      ]);
      return;
    }

    if (command === "clear") {
      setHistory([]);
      return;
    }

    if (command === "pwd") {
      add([{ text: `/home/jacob${cwd.length ? "/" + cwd.join("/") : ""}`, color: "#888" }]);
      return;
    }

    if (command === "whoami") {
      add([{ text: "root", color: "#ff5f57" }]);
      return;
    }

    if (command === "exit") {
      onExit();
      return;
    }

    if (command === "neofetch") {
      add([
        { text: "       ___   ____", color: theme.primary },
        { text: "      | |   / ___|", color: theme.primary },
        { text: "   _  | |  | |    ", color: theme.primary },
        { text: "  | |_| |  | |___ ", color: theme.secondary },
        { text: "   \\___/    \\____|", color: theme.secondary },
        { text: "", color: "#888" },
        { text: "  root@jc-os", color: theme.primary },
        { text: "  ─────────────────", color: "#333" },
        { text: "  OS:     JC OS v1.0", color: "#888" },
        { text: "  Host:   Portfolio Server", color: "#888" },
        { text: "  Kernel: next-16.1.6", color: "#888" },
        { text: "  Shell:  jc-bash 1.0", color: "#888" },
        { text: "  DE:     JC Desktop", color: "#888" },
        { text: "  CPU:    Creativity @ ∞ GHz", color: "#888" },
        { text: "  Memory: Coffee / Unlimited", color: theme.secondary },
      ]);
      return;
    }

    if (command === "themes") {
      const lines: { text: string; color: string }[] = [
        { text: "Available themes:", color: theme.secondary },
      ];
      for (const [id, t] of Object.entries(allThemes)) {
        const isCustom = customThemeIds.includes(id);
        const active = id === activeThemeId;
        lines.push({
          text: `  ${active ? "● " : "  "}${id.padEnd(12)} — ${t.name}${isCustom ? " [custom]" : ""}`,
          color: active ? theme.primary : "#888",
        });
      }
      lines.push({ text: '\nUsage: theme <name> | theme create | theme delete <name>', color: "#555" });
      add(lines);
      return;
    }

    if (command === "wallpapers") {
      const lines: { text: string; color: string }[] = [
        { text: "Available wallpapers:", color: theme.secondary },
      ];
      for (const [id, preset] of Object.entries(WALLPAPER_PRESETS)) {
        const active = id === activeWallpaper;
        lines.push({
          text: `  ${active ? "● " : "  "}${id.padEnd(12)} — ${preset.label}`,
          color: active ? theme.primary : "#888",
        });
      }
      lines.push({ text: '\nUsage: wallpaper <name>', color: "#555" });
      add(lines);
      return;
    }

    if (command === "wallpaper") {
      const target = args[0]?.toLowerCase();
      if (!target) {
        add([{ text: "Usage: wallpaper <name>", color: "#ff5f57" }, { text: 'Run "wallpapers" to see options.', color: "#555" }]);
        return;
      }
      if (WALLPAPER_PRESETS[target]) {
        setWallpaper(target);
        add([{ text: `Wallpaper set to ${target}.`, color: theme.primary }]);
      } else {
        add([{ text: `wallpaper: "${target}" not found.`, color: "#ff5f57" }, { text: 'Run "wallpapers" to see options.', color: "#555" }]);
      }
      return;
    }

    if (command === "theme") {
      const target = args[0]?.toLowerCase();
      if (!target) {
        add([{ text: "Usage: theme <name> | theme create | theme delete <name>", color: "#ff5f57" }, { text: 'Run "themes" to see available themes.', color: "#555" }]);
        return;
      }

      if (target === "create") {
        add([
          { text: "── Theme Creator ──", color: theme.secondary },
          { text: "Enter theme name:", color: theme.primary },
        ]);
        wizardData.current = { name: "", primary: "", secondary: "", wallpaper: "grid" };
        setWizardStep(1);
        return;
      }

      if (target === "delete") {
        const delTarget = args[1]?.toLowerCase();
        if (!delTarget) {
          add([{ text: "Usage: theme delete <name>", color: "#ff5f57" }]);
          return;
        }
        if (BUILTIN_THEME_IDS.includes(delTarget as typeof BUILTIN_THEME_IDS[number])) {
          add([{ text: `Cannot delete built-in theme "${delTarget}".`, color: "#ff5f57" }]);
          return;
        }
        if (!customThemeIds.includes(delTarget)) {
          add([{ text: `theme: "${delTarget}" not found in custom themes.`, color: "#ff5f57" }]);
          return;
        }
        fetch("/api/themes", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: delTarget }),
        })
          .then((res) => res.json())
          .then(async (data) => {
            if (data.error) {
              setHistory((prev) => [...prev, { text: `Error: ${data.error}`, color: "#ff5f57" }]);
            } else {
              await reloadThemes();
              setHistory((prev) => [...prev, { text: `Theme "${delTarget}" deleted.`, color: theme.primary }]);
            }
          })
          .catch(() => {
            setHistory((prev) => [...prev, { text: "Error: Failed to delete theme.", color: "#ff5f57" }]);
          });
        add([{ text: `Deleting theme "${delTarget}"...`, color: "#555" }]);
        return;
      }

      if (target in allThemes) {
        setThemeId(target);
        const t = allThemes[target];
        add([{ text: `Theme switched to ${t.name}.`, color: t.primary }]);
      } else {
        add([{ text: `theme: "${target}" not found.`, color: "#ff5f57" }, { text: 'Run "themes" to see available themes.', color: "#555" }]);
      }
      return;
    }

    if (command === "ls") {
      const dir = resolvePath(cwd);
      const entries = dir ? dir.entries : FILESYSTEM;
      const names = Object.entries(entries).map(([name, entry]) =>
        entry.type === "dir" ? name + "/" : name
      );
      add([{ text: names.join("  "), color: "#888" }]);
      return;
    }

    if (command === "cd") {
      const target = args[0];
      if (!target || target === "~") {
        setCwd([]);
        add([]);
        return;
      }
      if (target === "..") {
        setCwd((prev) => prev.slice(0, -1));
        add([]);
        return;
      }
      const dir = resolvePath(cwd);
      const entries = dir ? dir.entries : FILESYSTEM;
      const entry = entries[target] || entries[target.replace(/\/$/, "")];
      if (entry && entry.type === "dir") {
        setCwd((prev) => [...prev, target.replace(/\/$/, "")]);
        add([]);
      } else {
        add([{ text: `cd: ${target}: Not a directory`, color: "#ff5f57" }]);
      }
      return;
    }

    if (command === "cat") {
      const target = args[0];
      if (!target) {
        add([{ text: "cat: missing file operand", color: "#ff5f57" }]);
        return;
      }
      const dir = resolvePath(cwd);
      const entries = dir ? dir.entries : FILESYSTEM;
      const entry = entries[target];
      if (entry && entry.type === "file") {
        add(entry.content.split("\n").map((line) => ({ text: line, color: "#e8e8e8" })));
      } else {
        add([{ text: `cat: ${target}: No such file`, color: "#ff5f57" }]);
      }
      return;
    }

    add([{ text: `bash: ${command}: command not found`, color: "#ff5f57" }]);
  };

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto p-3 cursor-text"
      onClick={() => inputRef.current?.focus()}
      style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1a1a #0a0a0a" }}
    >
      {history.map((line, i) => (
        <div
          key={i}
          className="text-[11px] leading-[1.8] whitespace-pre-wrap break-words"
          style={{ color: line.color }}
        >
          {line.text}
        </div>
      ))}
      <div className="flex items-center text-[11px] leading-[1.8]">
        <span className="shrink-0" style={{ color: wizardStep > 0 ? theme.secondary : theme.primary }}>
          {wizardStep > 0 ? "→ " : prompt}&nbsp;
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (wizardStep > 0) {
                handleWizardInput(input);
              } else {
                run(input);
              }
              setInput("");
            }
          }}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent outline-none text-[#e8e8e8] text-[11px]"
          style={{ fontFamily: "inherit", caretColor: theme.primary }}
          autoFocus
        />
      </div>
    </div>
  );
}

// ─── Files App ───────────────────────────────────────────────────────────────

function FilesApp() {
  const { theme } = useContext(ThemeContext);
  const [path, setPath] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const dir = resolvePath(path);
  const entries = dir ? dir.entries : FILESYSTEM;

  return (
    <div className="h-full flex flex-col">
      {/* Path bar */}
      <div className="px-3 py-2 border-b border-[#1a1a1a] bg-[#080808] flex items-center gap-2 text-[10px] shrink-0">
        <button
          onClick={() => {
            setPath((p) => p.slice(0, -1));
            setSelectedFile(null);
          }}
          className="text-[#555] hover:brightness-150 transition cursor-pointer"
          style={{ color: "#555" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.primary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
        >
          ←
        </button>
        <span className="text-[#555]">
          /home/jacob{path.length ? "/" + path.join("/") : ""}
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File list */}
        <div
          className="flex-1 overflow-y-auto p-2"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1a1a #0a0a0a" }}
        >
          {Object.entries(entries).map(([name, entry]) => (
            <button
              key={name}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] text-left hover:bg-white/5 transition rounded cursor-pointer"
              style={{
                color: selectedFile === name ? theme.primary : "#888",
                backgroundColor: selectedFile === name ? `rgba(${theme.primaryRgb},0.1)` : undefined,
              }}
              onClick={() => setSelectedFile(name)}
              onDoubleClick={() => {
                if (entry.type === "dir") {
                  setPath((p) => [...p, name]);
                  setSelectedFile(null);
                }
              }}
            >
              <span style={{ color: entry.type === "dir" ? theme.secondary : "#555" }}>
                {entry.type === "dir" ? "📁" : "📄"}
              </span>
              {name}
            </button>
          ))}
        </div>

        {/* Preview pane */}
        {selectedFile && entries[selectedFile]?.type === "file" && (
          <div
            className="w-[45%] border-l border-[#1a1a1a] p-3 overflow-y-auto text-[10px] text-[#888] whitespace-pre-wrap"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1a1a #0a0a0a" }}
          >
            <div className="text-[9px] text-[#555] mb-2 uppercase tracking-wider">Preview</div>
            {(entries[selectedFile] as { type: "file"; content: string }).content}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── System Monitor App ──────────────────────────────────────────────────────

function MonitorApp() {
  const { theme } = useContext(ThemeContext);
  const [cpu, setCpu] = useState(42);
  const [mem, setMem] = useState(61);
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(42));

  useEffect(() => {
    const interval = setInterval(() => {
      setCpu((prev) => {
        const next = Math.round(Math.max(5, Math.min(95, prev + (Math.random() - 0.48) * 20)));
        setCpuHistory((h) => [...h.slice(1), next]);
        return next;
      });
      setMem((prev) => Math.round(Math.max(40, Math.min(85, prev + (Math.random() - 0.5) * 3))));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const processes = [
    { name: "next-server", cpu: 12.3, mem: 245 },
    { name: "jc-desktop", cpu: 8.1, mem: 180 },
    { name: "node", cpu: 5.7, mem: 320 },
    { name: "chrome", cpu: 34.2, mem: 1024 },
    { name: "coffee-daemon", cpu: 0.1, mem: 16 },
    { name: "creativity-engine", cpu: 99.9, mem: 8192 },
    { name: "sleep-scheduler", cpu: 0.0, mem: 0 },
  ];

  return (
    <div
      className="h-full overflow-y-auto p-4 space-y-4"
      style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1a1a #0a0a0a" }}
    >
      {/* CPU & Memory bars */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1.5">CPU</div>
          <div className="h-4 bg-[#111] overflow-hidden border border-[#1a1a1a]">
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${cpu}%`,
                background: cpu > 80 ? "#ff5f57" : `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
              }}
            />
          </div>
          <div className="text-[11px] text-[#888] mt-1">{cpu}%</div>
        </div>
        <div>
          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1.5">Memory</div>
          <div className="h-4 bg-[#111] overflow-hidden border border-[#1a1a1a]">
            <div
              className="h-full transition-all duration-700"
              style={{
                width: `${mem}%`,
                background: mem > 80 ? "#ff5f57" : "linear-gradient(90deg, #00f0d4, #f0a500)",
              }}
            />
          </div>
          <div className="text-[11px] text-[#888] mt-1">{mem}% — {Math.round(mem * 0.32)}GB / 32GB</div>
        </div>
      </div>

      {/* CPU Graph */}
      <div>
        <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1.5">CPU History</div>
        <div className="h-20 bg-[#080808] border border-[#1a1a1a] flex items-end gap-px p-1">
          {cpuHistory.map((val, i) => (
            <div
              key={i}
              className="flex-1 transition-all duration-300"
              style={{
                height: `${val}%`,
                background:
                  val > 80
                    ? "#ff5f57"
                    : val > 50
                    ? theme.secondary
                    : theme.primary,
                opacity: 0.4 + (i / cpuHistory.length) * 0.6,
              }}
            />
          ))}
        </div>
      </div>

      {/* Processes */}
      <div>
        <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1.5">Processes</div>
        <div className="border border-[#1a1a1a]">
          <div className="grid grid-cols-3 gap-2 px-3 py-1.5 bg-[#0f0f0f] text-[9px] text-[#555] uppercase tracking-wider border-b border-[#1a1a1a]">
            <span>Name</span>
            <span>CPU %</span>
            <span>Mem (MB)</span>
          </div>
          {processes.map((p) => (
            <div
              key={p.name}
              className="grid grid-cols-3 gap-2 px-3 py-1 text-[11px] border-b border-[#0f0f0f] hover:bg-white/[0.02]"
            >
              <span className="text-[#888]">{p.name}</span>
              <span style={{ color: p.cpu > 80 ? "#ff5f57" : p.cpu > 50 ? theme.secondary : "#555" }}>
                {p.cpu}
              </span>
              <span className="text-[#555]">{p.mem}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── About App ───────────────────────────────────────────────────────────────

function AboutApp() {
  const { theme } = useContext(ThemeContext);
  return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
      {/* Logo */}
      <svg width="64" height="42" viewBox="0 0 120 80" fill="none" className="mb-4">
        <path
          d="M20 10 L20 50 Q20 65 35 65 L42 65"
          stroke={theme.primary}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{ filter: `drop-shadow(0 0 6px ${theme.primary})` }}
        />
        <path
          d="M100 15 L75 15 Q60 15 60 30 L60 50 Q60 65 75 65 L100 65"
          stroke={theme.secondary}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{ filter: `drop-shadow(0 0 6px ${theme.secondary})` }}
        />
        <circle cx="50" cy="40" r="3.5" fill={theme.primary} style={{ filter: `drop-shadow(0 0 4px ${theme.primary})` }} />
      </svg>

      <div className="text-sm text-[#e8e8e8] font-semibold mb-0.5">JC OS</div>
      <div className="text-[10px] text-[#555] mb-4">Version 1.0.0</div>

      <div className="space-y-1.5 text-[11px] text-[#888]">
        <div>
          Built by{" "}
          <span style={{ color: theme.primary, textShadow: `0 0 8px rgba(${theme.primaryRgb},0.3)` }}>
            Jacob Chodubski
          </span>
        </div>
        <div>Powered by Next.js + TypeScript</div>
        <div className="text-[#555] mt-3 text-[10px]">
          You found the secret. Congrats. 🎉
        </div>
      </div>

      <div className="mt-6 px-4 py-2 border border-[#1a1a1a] text-[10px] text-[#333]">
        "Any sufficiently advanced portfolio is indistinguishable from an OS."
      </div>
    </div>
  );
}

// ─── Notepad App ─────────────────────────────────────────────────────────────

function NotepadApp() {
  const { theme } = useContext(ThemeContext);
  const [text, setText] = useState("# Welcome to JC Notepad\n\nStart typing here...\n");

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-1.5 border-b border-[#1a1a1a] bg-[#080808] text-[10px] text-[#555] shrink-0">
        untitled.md — {text.split("\n").length} lines
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 bg-transparent p-3 text-[11px] text-[#e8e8e8] outline-none resize-none"
        style={{
          fontFamily: "inherit",
          scrollbarWidth: "thin",
          scrollbarColor: "#1a1a1a #0a0a0a",
          caretColor: theme.primary,
        }}
        spellCheck={false}
      />
    </div>
  );
}

// ─── Visitors App ───────────────────────────────────────────────────────────

interface VisitorEntry {
  id: string;
  timestamp: string;
  ip: string;
  page: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  browser: string;
  os: string;
  device: string;
  country: string;
  region: string;
  city: string;
  isp: string;
  org: string;
  lat: number | null;
  lon: number | null;
  timezone: string;
}

function VisitorsApp() {
  const { theme } = useContext(ThemeContext);
  const [visits, setVisits] = useState<VisitorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VisitorEntry | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/track")
      .then((r) => r.json())
      .then((data) => {
        setVisits(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = visits.filter((v) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      v.ip.toLowerCase().includes(q) ||
      v.city.toLowerCase().includes(q) ||
      v.country.toLowerCase().includes(q) ||
      v.org.toLowerCase().includes(q) ||
      v.browser.toLowerCase().includes(q) ||
      v.utmSource.toLowerCase().includes(q) ||
      v.page.toLowerCase().includes(q)
    );
  });

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("en-GB", {
      timeZone: "Europe/Warsaw",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSource = (v: VisitorEntry) => v.utmSource || v.referrer || "Direct";

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-[11px] text-[#555]" style={{ color: theme.primary }}>Loading visits...</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Stats bar */}
      <div className="px-3 py-2 border-b border-[#1a1a1a] bg-[#080808] flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.primary, boxShadow: `0 0 6px ${theme.primary}` }} />
          <span className="text-[10px] text-[#555] uppercase tracking-wider">Total</span>
          <span className="text-[11px] tabular-nums" style={{ color: theme.primary }}>{visits.length}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#555] uppercase tracking-wider">Today</span>
          <span className="text-[11px] tabular-nums" style={{ color: theme.secondary }}>
            {visits.filter((v) => new Date(v.timestamp).toDateString() === new Date().toDateString()).length}
          </span>
        </div>
        <div className="flex-1" />
        <input
          type="text"
          placeholder="Filter..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-[#111] border border-[#1a1a1a] text-[10px] text-[#ccc] px-2 py-1 w-32 outline-none"
          style={{ caretColor: theme.primary }}
        />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* List */}
        <div
          className="w-[260px] shrink-0 border-r border-[#1a1a1a] overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1a1a #0a0a0a" }}
        >
          {filtered.length === 0 ? (
            <div className="p-4 text-[11px] text-[#444] text-center">No visits found</div>
          ) : (
            filtered.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v)}
                className="w-full text-left px-3 py-2 border-b border-[#0f0f0f] transition cursor-pointer"
                style={{
                  background: selected?.id === v.id ? `rgba(${theme.primaryRgb},0.08)` : "transparent",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#aaa] truncate">{v.city || v.ip}{v.country ? `, ${v.country}` : ""}</span>
                  <span className="text-[9px] text-[#444] shrink-0 ml-2">{formatTime(v.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: `rgba(${theme.primaryRgb},0.1)`, color: theme.primary }}>
                    {getSource(v)}
                  </span>
                  <span className="text-[9px] text-[#444]">{v.device} — {v.browser}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div
          className="flex-1 overflow-y-auto p-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1a1a #0a0a0a" }}
        >
          {selected ? (
            <div className="space-y-4">
              {/* Header */}
              <div>
                <div className="text-[13px] text-[#e8e8e8] font-medium">
                  {selected.city || "Unknown"}{selected.region ? `, ${selected.region}` : ""}{selected.country ? ` — ${selected.country}` : ""}
                </div>
                <div className="text-[10px] text-[#555] mt-0.5">
                  {new Date(selected.timestamp).toLocaleString("en-GB", {
                    timeZone: "Europe/Warsaw",
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              </div>

              {/* Visit section */}
              <DetailSection theme={theme} title="Visit">
                <DetailRow label="Page" value={selected.page} theme={theme} />
                <DetailRow label="Source" value={getSource(selected)} theme={theme} highlight />
                <DetailRow label="Referrer" value={selected.referrer || "—"} theme={theme} />
                <DetailRow label="IP" value={selected.ip} theme={theme} />
              </DetailSection>

              {/* UTM section */}
              {(selected.utmSource || selected.utmMedium || selected.utmCampaign) && (
                <DetailSection theme={theme} title="Campaign">
                  {selected.utmSource && <DetailRow label="Source" value={selected.utmSource} theme={theme} />}
                  {selected.utmMedium && <DetailRow label="Medium" value={selected.utmMedium} theme={theme} />}
                  {selected.utmCampaign && <DetailRow label="Campaign" value={selected.utmCampaign} theme={theme} />}
                  {selected.utmTerm && <DetailRow label="Term" value={selected.utmTerm} theme={theme} />}
                  {selected.utmContent && <DetailRow label="Content" value={selected.utmContent} theme={theme} />}
                </DetailSection>
              )}

              {/* Device section */}
              <DetailSection theme={theme} title="Device">
                <DetailRow label="Browser" value={selected.browser} theme={theme} />
                <DetailRow label="OS" value={selected.os} theme={theme} />
                <DetailRow label="Type" value={selected.device} theme={theme} />
              </DetailSection>

              {/* Location section */}
              <DetailSection theme={theme} title="Location & Network">
                <DetailRow label="City" value={selected.city || "—"} theme={theme} />
                <DetailRow label="Region" value={selected.region || "—"} theme={theme} />
                <DetailRow label="Country" value={selected.country || "—"} theme={theme} />
                <DetailRow label="Timezone" value={selected.timezone || "—"} theme={theme} />
                {selected.lat !== null && <DetailRow label="Coords" value={`${selected.lat}, ${selected.lon}`} theme={theme} />}
                <DetailRow label="ISP" value={selected.isp || "—"} theme={theme} />
                <DetailRow label="Org" value={selected.org || "—"} theme={theme} />
              </DetailSection>

              {/* Map link */}
              {selected.lat !== null && selected.lon !== null && (
                <a
                  href={`https://www.google.com/maps?q=${selected.lat},${selected.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[10px] px-3 py-1.5 border transition hover:opacity-80"
                  style={{ borderColor: theme.primary, color: theme.primary }}
                >
                  View on Google Maps
                </a>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[11px] text-[#444]">
              Select a visitor to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailSection({ theme, title, children }: { theme: OSTheme; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: theme.primary, opacity: 0.6 }}>{title}</div>
      <div className="border border-[#1a1a1a] divide-y divide-[#0f0f0f]">{children}</div>
    </div>
  );
}

function DetailRow({ label, value, theme, highlight }: { label: string; value: string; theme: OSTheme; highlight?: boolean }) {
  return (
    <div className="flex px-3 py-1.5 text-[11px]">
      <span className="w-20 shrink-0 text-[#555]">{label}</span>
      <span className={highlight ? "" : "text-[#aaa]"} style={highlight ? { color: theme.secondary } : undefined}>{value}</span>
    </div>
  );
}

// ─── Taskbar ─────────────────────────────────────────────────────────────────

function Taskbar({
  windows,
  onFocus,
  onOpen,
}: {
  windows: WindowState[];
  onFocus: (id: string) => void;
  onOpen: (app: AppId) => void;
}) {
  const { theme } = useContext(ThemeContext);
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 h-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-[#1a1a1a] flex items-center px-2 gap-1 z-[9998]"
    >
      {/* Start button */}
      <button
        className="h-7 px-2.5 flex items-center gap-1.5 hover:bg-white/5 transition rounded cursor-pointer"
        onClick={() => onOpen("terminal")}
      >
        <svg width="16" height="11" viewBox="0 0 120 80" fill="none">
          <path d="M20 10 L20 50 Q20 65 35 65 L42 65" stroke={theme.primary} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M100 15 L75 15 Q60 15 60 30 L60 50 Q60 65 75 65 L100 65" stroke={theme.secondary} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="50" cy="40" r="4" fill={theme.primary} />
        </svg>
      </button>

      <div className="w-px h-5 bg-[#1a1a1a] mx-1" />

      {/* Window list */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {windows.map((win) => (
          <button
            key={win.id}
            data-taskbar-id={win.id}
            onClick={() => onFocus(win.id)}
            className={`h-7 px-3 text-[10px] tracking-wider flex items-center gap-1.5 rounded transition cursor-pointer ${
              win.minimized ? "text-[#444] hover:bg-white/5" : "text-[#888] bg-white/5"
            }`}
          >
            <span>{APPS[win.app].icon}</span>
            {win.title}
          </button>
        ))}
      </div>

      {/* System tray */}
      <div className="flex items-center gap-3 px-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#28c840]" style={{ boxShadow: "0 0 6px #28c840" }} />
        <span className="text-[10px] text-[#555] tabular-nums">{time}</span>
      </div>
    </div>
  );
}
