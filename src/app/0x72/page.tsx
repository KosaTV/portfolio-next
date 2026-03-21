"use client";

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import CustomCursor from "@/components/CustomCursor";

// ─── Types ───────────────────────────────────────────────────────────────────

type AppId = "terminal" | "files" | "monitor" | "about" | "notepad" | "analytics" | "music" | "clock";
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
  glassy?: boolean;
}

// ─── Themes ─────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

const BUILTIN_THEME_IDS = ["cyber", "crimson", "violet", "matrix", "arctic", "amber", "glass"] as const;
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
  glass:   { name: "Glass",   primary: "#88ccff", secondary: "#ccddff", primaryRgb: "136,204,255", secondaryRgb: "204,221,255", wallpaper: "radial", glassy: true },
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

// ─── Music player shared types & sync context ────────────────────────────────

interface MusicTrack {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

// MusicApp populates this context so SysPage can render the mini-player
// without lifting all player state out of MusicApp.
const MusicSyncContext = createContext<{
  reportState: (s: { isPlaying: boolean; currentTrack: MusicTrack | null; progress: number; duration: number }) => void;
  registerControls: (c: { togglePlay: () => void; next: () => void; prev: () => void }) => void;
}>({ reportState: () => {}, registerControls: () => {} });

// ─── Constants ───────────────────────────────────────────────────────────────

const APPS: Record<AppId, { label: string; icon: string }> = {
  terminal: { label: "Terminal", icon: ">_" },
  files: { label: "Files", icon: "📁" },
  monitor: { label: "System Monitor", icon: "📊" },
  about: { label: "About JC OS", icon: "ℹ" },
  notepad: { label: "Notepad", icon: "📝" },
  analytics: { label: "Analytics", icon: "📊" },
  music: { label: "Music", icon: "♫" },
  clock: { label: "Clock", icon: "🕐" },
};

const ICON_GRID = 96;
const DESKTOP_PAD = 12;
const DESKTOP_ICONS: { app: AppId; x: number; y: number }[] = [
  { app: "terminal", x: DESKTOP_PAD, y: DESKTOP_PAD },
  { app: "files", x: DESKTOP_PAD, y: DESKTOP_PAD + ICON_GRID },
  { app: "monitor", x: DESKTOP_PAD, y: DESKTOP_PAD + ICON_GRID * 2 },
  { app: "about", x: DESKTOP_PAD, y: DESKTOP_PAD + ICON_GRID * 3 },
  { app: "notepad", x: DESKTOP_PAD, y: DESKTOP_PAD + ICON_GRID * 4 },
  { app: "analytics", x: DESKTOP_PAD, y: DESKTOP_PAD + ICON_GRID * 5 },
  { app: "music", x: DESKTOP_PAD, y: DESKTOP_PAD + ICON_GRID * 6 },
  { app: "clock", x: DESKTOP_PAD + ICON_GRID, y: DESKTOP_PAD },
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

  const [booted, setBooted] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const desktopRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<{ startX: number; startY: number } | null>(null);

  // Mini-player state — populated by MusicApp via MusicSyncContext
  const [miniMusicState, setMiniMusicState] = useState<{ isPlaying: boolean; currentTrack: MusicTrack | null; progress: number; duration: number } | null>(null);
  const musicControlsRef = useRef<{ togglePlay: () => void; next: () => void; prev: () => void } | null>(null);
  const musicSync = useRef({
    reportState: (s: { isPlaying: boolean; currentTrack: MusicTrack | null; progress: number; duration: number }) => setMiniMusicState(s),
    registerControls: (c: { togglePlay: () => void; next: () => void; prev: () => void }) => { musicControlsRef.current = c; },
  });
  const [selection, setSelection] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectedIcons, setSelectedIcons] = useState<Set<AppId>>(new Set());
  const selectedIconsRef = useRef(selectedIcons);
  useEffect(() => { selectedIconsRef.current = selectedIcons; }, [selectedIcons]);
  const [iconPositions, setIconPositionsRaw] = useState<Record<AppId, { x: number; y: number }>>(
    () => Object.fromEntries(DESKTOP_ICONS.map(({ app, x, y }) => [app, { x, y }])) as Record<AppId, { x: number; y: number }>
  );
  const setIconPositions: typeof setIconPositionsRaw = (update) => {
    setIconPositionsRaw(update);
    iconPosDirty.current = true;
  };
  const iconPosDirty = useRef(false);

  // Alarms (OS-level so they fire even when Clock is closed)
  const [alarms, setAlarmsRaw] = useState<{ time: string; enabled: boolean; id: number }[]>([]);
  const setAlarms = (update: React.SetStateAction<{ time: string; enabled: boolean; id: number }[]>) => {
    setAlarmsRaw((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      fetch("/api/themes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ alarms: next }) }).catch(() => {});
      return next;
    });
  };
  const alarmIdRef = useRef(0);
  const lastAlarmMinute = useRef("");
  const [alarmFiring, setAlarmFiring] = useState<string | null>(null);
  const iconPositionsRef = useRef(iconPositions);
  useEffect(() => { iconPositionsRef.current = iconPositions; }, [iconPositions]);
  const iconDragRef = useRef<{ app: AppId; startMX: number; startMY: number; startPositions: Record<AppId, { x: number; y: number }>; didMove: boolean } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [ctxSub, setCtxSub] = useState<string | null>(null);
  const ctxSubTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [customWallpaperUrl, setCustomWallpaperUrlRaw] = useState<string | null>(null);
  const setCustomWallpaperUrl = useCallback((url: string | null) => {
    setCustomWallpaperUrlRaw(url);
    if (url) localStorage.setItem("jcos_custom_wallpaper", url);
    else localStorage.removeItem("jcos_custom_wallpaper");
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [switcherIndex, setSwitcherIndex] = useState<number | null>(null);
  const switcherTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [themeId, setThemeIdRaw] = useState<ThemeId>("cyber");
  const [customThemes, setCustomThemes] = useState<Record<string, OSTheme>>({});
  const [wallpaperPreset, setWallpaperPresetRaw] = useState("grid");

  const allThemes: Record<string, OSTheme> = { ...THEMES, ...customThemes };
  const theme = allThemes[themeId] || THEMES.cyber;
  const customThemeIds = Object.keys(customThemes);
  const wallpaper = WALLPAPER_PRESETS[wallpaperPreset]?.generate(theme.primaryRgb) || WALLPAPER_PRESETS.grid.generate(theme.primaryRgb);

  const reloadThemes = useCallback(async () => {
    const res = await fetch("/api/themes");
    const data: { themes: Record<string, { id: string; name: string; primary: string; secondary: string; wallpaper?: string }>; activeTheme: string; activeWallpaper?: string; alarms?: { time: string; enabled: boolean; id: number }[]; iconPositions?: Record<string, { x: number; y: number }> } = await res.json();
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
    if (data.alarms) {
      setAlarmsRaw(data.alarms);
      alarmIdRef.current = data.alarms.reduce((max, a) => Math.max(max, a.id), 0);
    }
    if (data.iconPositions) {
      setIconPositionsRaw((prev) => ({ ...prev, ...data.iconPositions } as typeof prev));
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
    const saved = localStorage.getItem("jcos_custom_wallpaper");
    if (saved) setCustomWallpaperUrlRaw(saved);
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
      setWindows((prev) => {
        const maxZ = prev.length > 0 ? Math.max(...prev.map((w) => w.zIndex)) : 10;
        const newZ = maxZ + 1;
        return [
          ...prev,
          {
            id,
            app,
            title: APPS[app].label,
            x: 120 + Math.random() * 200,
            y: 60 + Math.random() * 100,
            w: app === "terminal" ? 600 : app === "monitor" ? 500 : app === "about" ? 420 : app === "music" ? 480 : app === "clock" ? 400 : 520,
            h: app === "terminal" ? 380 : app === "monitor" ? 400 : app === "about" ? 340 : app === "music" ? 460 : app === "clock" ? 420 : 380,
            minimized: false,
            maximized: false,
            zIndex: newZ,
          },
        ];
      });
    },
    []
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

  // Strip ?yt=ok from URL immediately on mount, remember to open music after boot
  const openMusicAfterBoot = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("yt") === "ok") {
      window.history.replaceState({}, "", window.location.pathname);
      openMusicAfterBoot.current = true;
    }
  }, []);

  // Auto-open Music Player once boot finishes
  useEffect(() => {
    if (!booted || !openMusicAfterBoot.current) return;
    openMusicAfterBoot.current = false;
    openApp("music");
  }, [booted, openApp]);

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
      return { ...w, maximized: true, preMaximized: { x: w.x, y: w.y, w: w.w, h: w.h }, x: SNAP_GAP, y: SNAP_GAP, w: window.innerWidth - SNAP_GAP * 2, h: window.innerHeight - TASKBAR_H - SNAP_GAP * 2 };
    }));

  const focusWindow = (id: string) => {
    let wasMinimized = false;
    setWindows((prev) => {
      const maxZ = Math.max(...prev.map((w) => w.zIndex));
      const newZ = maxZ + 1;
      wasMinimized = prev.find((w) => w.id === id)?.minimized ?? false;
      return prev.map((w) => {
        if (w.id !== id) return w;
        if (w.minimized) return { ...w, zIndex: newZ, minimized: false, restoring: true };
        return { ...w, zIndex: newZ };
      });
    });
    if (wasMinimized) {
      setTimeout(() => setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, restoring: false } : w))), 350);
    }
  };

  const updateWindow = (id: string, updates: Partial<WindowState>) =>
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, ...updates } : w)));

  // Desktop selection rectangle
  const handleDesktopMouseDown = (e: React.MouseEvent) => {
    if (ctxMenu) { setCtxMenu(null); setCtxSub(null); return; }
    // Only start selection if clicking directly on the desktop background
    if (e.target !== desktopRef.current) return;
    selectionRef.current = { startX: e.clientX, startY: e.clientY };
    setSelection(null);
    setSelectedIcons(new Set());
  };

  const handleDesktopContextMenu = (e: React.MouseEvent) => {
    if (e.target !== desktopRef.current) return;
    e.preventDefault();
    setCtxSub(null);
    setCtxMenu({ x: e.clientX, y: e.clientY });
  };

  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCustomWallpaperUrl(dataUrl);
    };
    reader.readAsDataURL(file);
    setCtxMenu(null);
    setCtxSub(null);
    e.target.value = "";
  };

  // OS-level alarm check (fires even when Clock app is closed)
  useEffect(() => {
    const id = setInterval(() => {
      const timeStr = new Date().toTimeString().slice(0, 5);
      if (timeStr === lastAlarmMinute.current) return;
      setAlarmsRaw((currentAlarms) => {
        currentAlarms.forEach((a) => {
          if (a.enabled && a.time === timeStr) {
            setAlarmFiring(a.time);
            lastAlarmMinute.current = timeStr;
          }
        });
        return currentAlarms;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Debounced icon position save
  useEffect(() => {
    const id = setTimeout(() => {
      if (iconPosDirty.current) {
        iconPosDirty.current = false;
        fetch("/api/themes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ iconPositions }) }).catch(() => {});
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [iconPositions]);

  // Keyboard shortcuts
  useEffect(() => {
    const sortedWindowsRef = () => {
      const visible = windows.filter((w) => !w.closing);
      return [...visible].sort((a, b) => b.zIndex - a.zIndex);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl+W / Ctrl+Q — close focused window
      if (e.ctrlKey && (e.key === "q" || e.key === "w")) {
        e.preventDefault();
        setWindows((prev) => {
          const visible = prev.filter((w) => !w.minimized && !w.closing);
          if (visible.length === 0) return prev;
          const top = visible.reduce((a, b) => (a.zIndex > b.zIndex ? a : b));
          return prev.map((w) => (w.id === top.id ? { ...w, closing: true } : w));
        });
        setTimeout(() => setWindows((prev) => prev.filter((w) => !w.closing)), 150);
      }

      // Ctrl+Shift+Tab — cycle windows with switcher
      if (e.ctrlKey && e.shiftKey && e.key === "Tab") {
        e.preventDefault();
        const sorted = sortedWindowsRef();
        if (sorted.length < 2) return;

        setSwitcherIndex((prev) => {
          const next = prev === null ? 1 : (prev + 1) % sorted.length;
          return next;
        });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      // Close switcher when Ctrl or Shift is released
      if (e.key === "Control" || e.key === "Shift") {
        setSwitcherIndex((idx) => {
          if (idx === null) return null;
          const sorted = sortedWindowsRef();
          const target = sorted[idx];
          if (target) {
            const newZ = Math.max(...windows.map((w) => w.zIndex)) + 1;
            setWindows((prev) => prev.map((w) =>
              w.id === target.id
                ? { ...w, zIndex: newZ, minimized: false, restoring: w.minimized }
                : w
            ));
            setTimeout(() => setWindows((prev) => prev.map((w) => (w.restoring ? { ...w, restoring: false } : w))), 350);
          }
          return null;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [windows]);

  const handleIconMouseDown = (e: React.MouseEvent, app: AppId) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const isSelected = selectedIconsRef.current.has(app);
    if (!isSelected) setSelectedIcons(new Set([app]));
    iconDragRef.current = {
      app,
      startMX: e.clientX,
      startMY: e.clientY,
      startPositions: Object.fromEntries(
        Object.entries(iconPositionsRef.current).map(([k, v]) => [k, { ...v }])
      ) as Record<AppId, { x: number; y: number }>,
      didMove: false,
    };
  };

  useEffect(() => {
    const getDesktopBounds = () => {
      const el = desktopRef.current;
      if (!el) return { maxX: 9999, maxY: 9999 };
      return { maxX: el.clientWidth - DESKTOP_PAD - 80, maxY: el.clientHeight - DESKTOP_PAD - 80 };
    };

    const clamp = (v: number, max: number) => Math.max(DESKTOP_PAD, Math.min(v, max));

    const onMove = (e: MouseEvent) => {
      const drag = iconDragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startMX;
      const dy = e.clientY - drag.startMY;
      if (!drag.didMove && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      drag.didMove = true;

      const { maxX, maxY } = getDesktopBounds();
      const getDragged = (app: AppId) =>
        selectedIconsRef.current.has(app) ? selectedIconsRef.current : new Set([app]);

      const dragged = getDragged(drag.app);
      setIconPositions((prev) => {
        const next = { ...prev };
        for (const id of dragged) {
          const start = drag.startPositions[id];
          if (start) {
            next[id] = { x: clamp(start.x + dx, maxX), y: clamp(start.y + dy, maxY) };
          }
        }
        return next;
      });
    };

    const snapToGrid = (v: number, max: number) => {
      const n = Math.round((v - DESKTOP_PAD) / ICON_GRID);
      const maxN = Math.floor((max - DESKTOP_PAD) / ICON_GRID);
      return DESKTOP_PAD + Math.max(0, Math.min(n, maxN)) * ICON_GRID;
    };

    const onUp = () => {
      const drag = iconDragRef.current;
      if (!drag) return;
      if (!drag.didMove) {
        setSelectedIcons(new Set([drag.app]));
      } else {
        const { maxX, maxY } = getDesktopBounds();
        const dragged = selectedIconsRef.current.has(drag.app) ? selectedIconsRef.current : new Set([drag.app]);
        setIconPositions((prev) => {
          const next = { ...prev };
          for (const id of dragged) {
            const pos = next[id];
            if (pos) next[id] = { x: snapToGrid(pos.x, maxX), y: snapToGrid(pos.y, maxY) };
          }
          return next;
        });
      }
      iconDragRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      const pos = iconPositionsRef.current[icon.app] ?? icon;
      const iconLeft = desktopRect.left + pos.x;
      const iconTop = desktopRect.top + pos.y;
      const iconRight = iconLeft + ICON_W;
      const iconBottom = iconTop + ICON_H;

      const selRight = sel.x + sel.w;
      const selBottom = sel.y + sel.h;

      if (sel.x < iconRight && selRight > iconLeft && sel.y < iconBottom && selBottom > iconTop) {
        selected.add(icon.app);
      }
    }
    return selected;
  }, []); // reads from iconPositionsRef

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

  const minimizedMusicWin = windows.find((w) => w.app === "music" && w.minimized);

  return (
    <MusicSyncContext.Provider value={musicSync.current}>
    <ThemeContext.Provider value={{ theme, themeId, setThemeId, allThemes, customThemeIds, reloadThemes, wallpaper, wallpaperPreset, setWallpaper }}>
      <div
        className={`fixed inset-0 overflow-hidden select-none ${theme.glassy ? "custom-cursor" : ""}`}
        style={{
          backgroundColor: theme.glassy ? undefined : "#0a0a0a",
          fontFamily: "'JetBrains Mono', monospace",
          cursor: theme.glassy
            ? "none"
            : `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='17' height='21' viewBox='0 0 17 21'><path d='M1.5 1 L1.5 15.5 L5.5 12 L9 18.5 L11 17.5 L7.5 11 L12.5 11 Z' fill='${theme.primary}' stroke='#000' stroke-width='1' stroke-linejoin='round'/></svg>`)}") 1 1, default`,
          ...(customWallpaperUrl
            ? { backgroundImage: `url(${customWallpaperUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : theme.glassy
              ? { backgroundImage: `${wallpaper.background}, linear-gradient(135deg, #0a1628 0%, #0f0a28 30%, #1a0a20 60%, #0a1a28 100%)`, backgroundSize: wallpaper.backgroundSize || undefined }
              : { backgroundImage: wallpaper.background, backgroundSize: wallpaper.backgroundSize || undefined }),
        }}
        onMouseDown={handleFirstInteraction}
        onKeyDown={handleFirstInteraction}
      >
        {/* Glass cursor */}
        {theme.glassy && <CustomCursor color={theme.primary} ringSize={30} blur={6} />}

        {/* Scanlines — disabled for glass theme */}
        {!theme.glassy && (
          <div
            className="fixed inset-0 pointer-events-none z-[9999]"
            style={{
              backgroundImage:
                `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(${theme.primaryRgb},0.02) 2px, rgba(${theme.primaryRgb},0.02) 4px)`,
            }}
          />
        )}

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
        <div ref={desktopRef} className="absolute inset-0 pb-12" onMouseDown={handleDesktopMouseDown} onContextMenu={handleDesktopContextMenu}>
          {/* Desktop icons */}
          {DESKTOP_ICONS.map(({ app }) => {
            const pos = iconPositions[app];
            const isSelected = selectedIcons.has(app);
            return (
              <button
                key={app}
                className="absolute flex flex-col items-center gap-1.5 p-2 rounded cursor-pointer hover:bg-white/5"
                style={{
                  left: pos.x,
                  top: pos.y,
                  backgroundColor: isSelected ? `rgba(${theme.primaryRgb},0.1)` : undefined,
                  userSelect: "none",
                }}
                onDoubleClick={() => openApp(app)}
                onMouseDown={(e) => handleIconMouseDown(e, app)}
              >
                <div
                  className={`w-12 h-12 flex items-center justify-center border text-lg ${theme.glassy ? "backdrop-blur-xl rounded-xl" : "bg-[#0f0f0f]"}`}
                  style={{
                    ...(theme.glassy ? { background: "rgba(255,255,255,0.08)", boxShadow: isSelected ? `0 0 16px rgba(${theme.primaryRgb},0.3), inset 0 1px 0 rgba(255,255,255,0.1)` : `inset 0 1px 0 rgba(255,255,255,0.06)` } : { boxShadow: isSelected ? `0 0 12px rgba(${theme.primaryRgb},0.2)` : app === "terminal" ? `0 0 12px rgba(${theme.primaryRgb},0.1)` : "none" }),
                    color: app === "terminal" ? theme.primary : app === "monitor" ? theme.secondary : theme.glassy ? "rgba(255,255,255,0.7)" : "#888",
                    borderColor: isSelected ? `rgba(${theme.primaryRgb},0.4)` : theme.glassy ? "rgba(255,255,255,0.12)" : "#1a1a1a",
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

          {/* Windows — always rendered (display:none when minimized) so MusicApp stays alive */}
          {windows.map((win) => (
            <Window
              key={win.id}
              win={win}
              onClose={() => closeWindow(win.id)}
              onMinimize={() => minimizeWindow(win.id)}
              onToggleMaximize={() => toggleMaximize(win.id)}
              onFocus={() => focusWindow(win.id)}
              onMove={(x, y) => updateWindow(win.id, { x, y, maximized: false, preMaximized: undefined })}
              onResize={(w, h, x, y) => updateWindow(win.id, { w, h, maximized: false, ...(x !== undefined && { x }), ...(y !== undefined && { y }) })}
              onSnap={(snap) => updateWindow(win.id, { ...snap, maximized: snap.w >= window.innerWidth - SNAP_GAP * 2, preMaximized: { x: win.x, y: win.y, w: win.w, h: win.h } })}
              alarms={alarms}
              setAlarms={setAlarms}
              alarmIdRef={alarmIdRef}
            />
          ))}
        </div>

        {/* Hidden file input for wallpaper upload */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaperUpload} />

        {/* Desktop context menu */}
        {ctxMenu && (
          <div
            className={`fixed z-[9998] min-w-[200px] py-1.5 backdrop-blur-md border ${theme.glassy ? "border-white/15 backdrop-blur-2xl rounded-xl" : "bg-[#111]/95 border-[#222]"}`}
            style={{
              left: Math.min(ctxMenu.x, (typeof window !== "undefined" ? window.innerWidth : 1920) - 220),
              top: Math.min(ctxMenu.y, (typeof window !== "undefined" ? window.innerHeight : 1080) - 300),
              boxShadow: theme.glassy
                ? `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.08)`
                : `0 8px 32px rgba(0,0,0,0.6), 0 0 1px rgba(${theme.primaryRgb},0.15)`,
              ...(theme.glassy ? { background: "rgba(20,20,30,0.5)" } : {}),
            }}
          >
            {/* Open terminal */}
            <button
              className="w-full px-3 py-2 text-left text-[11px] text-[#ccc] hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer"
              onClick={() => { openApp("terminal"); setCtxMenu(null); }}
            >
              <span className="text-sm w-5 text-center">⌘</span> Open Terminal
            </button>

            <div className="h-px bg-[#222] mx-2 my-0.5" />

            {/* Change wallpaper submenu */}
            <div
              className="relative"
              onMouseEnter={() => { if (ctxSubTimeout.current) clearTimeout(ctxSubTimeout.current); setCtxSub("wallpaper"); }}
              onMouseLeave={() => { ctxSubTimeout.current = setTimeout(() => setCtxSub((s) => s === "wallpaper" ? null : s), 150); }}
            >
              <div
                className={`w-full px-3 py-2 text-[11px] text-[#ccc] transition flex items-center gap-2.5 cursor-default ${ctxSub === "wallpaper" ? "bg-white/10" : "hover:bg-white/10"}`}
              >
                <span className="text-sm w-5 text-center">🖼</span> Change Wallpaper
                <span className="ml-auto text-[9px] text-[#555]">▶</span>
              </div>
              {ctxSub === "wallpaper" && (
                <div
                  className={`absolute left-full top-0 min-w-[180px] py-1.5 backdrop-blur-md border ${theme.glassy ? "border-white/15 backdrop-blur-2xl rounded-xl" : "bg-[#111]/95 border-[#222]"}`}
                  style={{ boxShadow: theme.glassy ? `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)` : `0 8px 32px rgba(0,0,0,0.6)`, ...(theme.glassy ? { background: "rgba(20,20,30,0.5)" } : {}) }}
                  onMouseEnter={() => { if (ctxSubTimeout.current) clearTimeout(ctxSubTimeout.current); }}
                  onMouseLeave={() => { ctxSubTimeout.current = setTimeout(() => setCtxSub((s) => s === "wallpaper" ? null : s), 150); }}
                >
                  {/* Upload custom */}
                  <button
                    className="w-full px-3 py-2 text-left text-[11px] hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer"
                    style={{ color: theme.primary }}
                    onClick={() => { fileInputRef.current?.click(); }}
                  >
                    <span className="text-sm w-5 text-center">📁</span> Upload Image...
                  </button>
                  {customWallpaperUrl && (
                    <button
                      className="w-full px-3 py-2 text-left text-[11px] text-[#f87171] hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer"
                      onClick={() => { setCustomWallpaperUrl(null); setCtxMenu(null); setCtxSub(null); }}
                    >
                      <span className="text-sm w-5 text-center">✕</span> Remove Custom
                    </button>
                  )}
                  <div className="h-px bg-[#222] mx-2 my-0.5" />
                  {/* Preset wallpapers */}
                  {Object.entries(WALLPAPER_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      className="w-full px-3 py-2 text-left text-[11px] text-[#ccc] hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer"
                      style={{ color: wallpaperPreset === key && !customWallpaperUrl ? theme.primary : undefined }}
                      onClick={() => { setCustomWallpaperUrl(null); setWallpaper(key); setCtxMenu(null); setCtxSub(null); }}
                    >
                      <span className="text-sm w-5 text-center">{wallpaperPreset === key && !customWallpaperUrl ? "●" : "○"}</span> {preset.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Change theme submenu */}
            <div
              className="relative"
              onMouseEnter={() => { if (ctxSubTimeout.current) clearTimeout(ctxSubTimeout.current); setCtxSub("theme"); }}
              onMouseLeave={() => { ctxSubTimeout.current = setTimeout(() => setCtxSub((s) => s === "theme" ? null : s), 150); }}
            >
              <div
                className={`w-full px-3 py-2 text-[11px] text-[#ccc] transition flex items-center gap-2.5 cursor-default ${ctxSub === "theme" ? "bg-white/10" : "hover:bg-white/10"}`}
              >
                <span className="text-sm w-5 text-center">🎨</span> Change Theme
                <span className="ml-auto text-[9px] text-[#555]">▶</span>
              </div>
              {ctxSub === "theme" && (
                <div
                  className={`absolute left-full top-0 min-w-[160px] py-1.5 backdrop-blur-md border ${theme.glassy ? "border-white/15 backdrop-blur-2xl rounded-xl" : "bg-[#111]/95 border-[#222]"}`}
                  style={{ boxShadow: theme.glassy ? `0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)` : `0 8px 32px rgba(0,0,0,0.6)`, ...(theme.glassy ? { background: "rgba(20,20,30,0.5)" } : {}) }}
                  onMouseEnter={() => { if (ctxSubTimeout.current) clearTimeout(ctxSubTimeout.current); }}
                  onMouseLeave={() => { ctxSubTimeout.current = setTimeout(() => setCtxSub((s) => s === "theme" ? null : s), 150); }}
                >
                  {Object.entries(allThemes).map(([id, t]) => (
                    <button
                      key={id}
                      className="w-full px-3 py-2 text-left text-[11px] text-[#ccc] hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer"
                      style={{ color: themeId === id ? theme.primary : undefined }}
                      onClick={() => { setThemeId(id); setCtxMenu(null); setCtxSub(null); }}
                    >
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary})` }} />
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px bg-[#222] mx-2 my-0.5" />

            {/* About */}
            <button
              className="w-full px-3 py-2 text-left text-[11px] text-[#ccc] hover:bg-white/10 transition flex items-center gap-2.5 cursor-pointer"
              onClick={() => { openApp("about"); setCtxMenu(null); }}
            >
              <span className="text-sm w-5 text-center">ℹ</span> About
            </button>
          </div>
        )}

        {/* Taskbar */}
        <Taskbar windows={windows} onFocus={focusWindow} onOpen={openApp} />

        {/* Alarm notification (OS-level) */}
        {alarmFiring && (
          <div className="fixed inset-0 z-[10002] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div
              className="flex flex-col items-center gap-4 p-8 rounded-2xl"
              style={{
                background: theme.glassy ? "rgba(20,20,30,0.9)" : "rgba(10,10,10,0.95)",
                border: `1px solid rgba(${theme.primaryRgb},0.3)`,
                boxShadow: `0 0 60px rgba(${theme.primaryRgb},0.2), 0 16px 64px rgba(0,0,0,0.5)`,
              }}
            >
              <div className="text-4xl">🔔</div>
              <div className="text-3xl tabular-nums font-light" style={{ color: theme.primary }}>{alarmFiring}</div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: "#888" }}>Alarm</div>
              <button
                onClick={() => setAlarmFiring(null)}
                className="px-6 py-2 text-[11px] uppercase tracking-wider rounded-lg transition cursor-pointer"
                style={{ background: `rgba(${theme.primaryRgb},0.15)`, color: theme.primary, border: `1px solid rgba(${theme.primaryRgb},0.3)` }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Window switcher overlay */}
        {switcherIndex !== null && (() => {
          const sorted = [...windows.filter((w) => !w.closing)].sort((a, b) => b.zIndex - a.zIndex);
          return (
            <div className="fixed inset-0 z-[10001] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
              <div
                className={`flex gap-3 px-5 py-4 rounded-2xl border ${theme.glassy ? "border-white/15" : "border-[#222]"}`}
                style={{
                  background: theme.glassy ? "rgba(20,20,30,0.7)" : "rgba(10,10,10,0.95)",
                  boxShadow: "0 16px 64px rgba(0,0,0,0.5)",
                }}
              >
                {sorted.map((win, i) => (
                  <div
                    key={win.id}
                    className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all ${i === switcherIndex ? "scale-105" : "opacity-50"}`}
                    style={{
                      background: i === switcherIndex ? `rgba(${theme.primaryRgb},0.15)` : "transparent",
                      border: i === switcherIndex ? `1px solid rgba(${theme.primaryRgb},0.4)` : "1px solid transparent",
                      boxShadow: i === switcherIndex ? `0 0 20px rgba(${theme.primaryRgb},0.15)` : "none",
                    }}
                  >
                    <div
                      className="w-14 h-14 flex items-center justify-center text-2xl rounded-lg"
                      style={{
                        background: theme.glassy ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${theme.glassy ? "rgba(255,255,255,0.1)" : "#1a1a1a"}`,
                      }}
                    >
                      {APPS[win.app].icon}
                    </div>
                    <span className="text-[10px] tracking-wider max-w-[80px] truncate" style={{ color: i === switcherIndex ? theme.primary : "#666" }}>
                      {APPS[win.app].label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Mini player — shown when Music window is minimized */}
        {minimizedMusicWin && miniMusicState && (
          <MiniPlayer
            isPlaying={miniMusicState.isPlaying}
            currentTrack={miniMusicState.currentTrack}
            progress={miniMusicState.progress}
            duration={miniMusicState.duration}
            onTogglePlay={() => musicControlsRef.current?.togglePlay()}
            onPrev={() => musicControlsRef.current?.prev()}
            onNext={() => musicControlsRef.current?.next()}
            onRestore={() => focusWindow(minimizedMusicWin.id)}
          />
        )}
      </div>
    </ThemeContext.Provider>
    </MusicSyncContext.Provider>
  );
}

// ─── Window Component ────────────────────────────────────────────────────────

type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type SnapZone = "top" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | null;

const SNAP_THRESHOLD = 8;
const TASKBAR_H = 52;
const SNAP_GAP = 8;

const getSnapZone = (e: MouseEvent): SnapZone => {
  const atTop = e.clientY <= SNAP_THRESHOLD;
  const atBottom = e.clientY >= window.innerHeight - TASKBAR_H - SNAP_THRESHOLD;
  const atLeft = e.clientX <= SNAP_THRESHOLD;
  const atRight = e.clientX >= window.innerWidth - SNAP_THRESHOLD;

  if (atTop && atLeft) return "top-left";
  if (atTop && atRight) return "top-right";
  if (atBottom && atLeft) return "bottom-left";
  if (atBottom && atRight) return "bottom-right";
  if (atTop) return "top";
  if (atLeft) return "left";
  if (atRight) return "right";
  return null;
};

const getSnapRect = (zone: SnapZone) => {
  const g = SNAP_GAP;
  const fullH = window.innerHeight - TASKBAR_H - g * 2;
  const halfH = Math.floor(fullH / 2) - g / 2;
  const fullW = window.innerWidth;
  const halfW = Math.floor(fullW / 2) - g - g / 2;

  switch (zone) {
    case "top": return { x: g, y: g, w: fullW - g * 2, h: fullH };
    case "left": return { x: g, y: g, w: halfW, h: fullH };
    case "right": return { x: Math.floor(fullW / 2) + g / 2, y: g, w: halfW, h: fullH };
    case "top-left": return { x: g, y: g, w: halfW, h: halfH };
    case "top-right": return { x: Math.floor(fullW / 2) + g / 2, y: g, w: halfW, h: halfH };
    case "bottom-left": return { x: g, y: g + halfH + g, w: halfW, h: halfH };
    case "bottom-right": return { x: Math.floor(fullW / 2) + g / 2, y: g + halfH + g, w: halfW, h: halfH };
    default: return null;
  }
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
  alarms,
  setAlarms,
  alarmIdRef,
}: {
  win: WindowState;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onFocus: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number, x?: number, y?: number) => void;
  onSnap: (snap: { x: number; y: number; w: number; h: number }) => void;
  alarms: { time: string; enabled: boolean; id: number }[];
  setAlarms: (update: React.SetStateAction<{ time: string; enabled: boolean; id: number }[]>) => void;
  alarmIdRef: React.MutableRefObject<number>;
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
          setUnsnapping(true);
          onResize(pre.w, pre.h, newX, newY);
          setTimeout(() => setUnsnapping(false), 220);
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
  const [unsnapping, setUnsnapping] = useState(false);

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
        borderRadius: theme.glassy ? 16 : 4,
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
        ...(win.minimized && !win.minimizing && !win.restoring
          ? { display: "none" as const }
          : {}),
        ...(win.minimizing || win.restoring
          ? {
              transform: minimizeTransform || "none",
              opacity: minimizeTransform ? 0 : 1,
              transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              pointerEvents: "none" as const,
            }
          : {
              animation: win.closing ? "windowClose 0.15s ease forwards" : "windowOpen 0.15s ease",
              transition: unsnapping ? "left 0.2s ease, top 0.2s ease, width 0.2s ease, height 0.2s ease" : dragging ? "none" : "left 0.2s ease, top 0.2s ease, width 0.2s ease, height 0.2s ease",
            }),
      }}
      onMouseDown={onFocus}
    >
      <div
        className={`flex flex-col h-full overflow-hidden ${theme.glassy ? `${win.preMaximized || win.w * win.h > 400000 ? "" : "backdrop-blur-xl"} rounded-xl border border-white/15` : "border border-[#1a1a1a] bg-[#0a0a0a]"}`}
        style={{
          boxShadow: theme.glassy
            ? (win.preMaximized || win.w * win.h > 400000) ? "none" : `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.1)`
            : `0 8px 32px rgba(0,0,0,0.6), 0 0 1px rgba(${theme.primaryRgb},0.1)`,
          ...(theme.glassy ? { background: (win.preMaximized || win.w * win.h > 400000) ? "rgba(15,15,25,0.92)" : "rgba(20,20,30,0.55)" } : {}),
        }}
      >
        {/* Title bar */}
        <div
          className={`flex items-center gap-2 px-3 py-2 shrink-0 cursor-grab active:cursor-grabbing ${theme.glassy ? "border-none" : "border-b bg-[#0f0f0f] border-[#1a1a1a]"}`}
          onMouseDown={startDrag}
          onDoubleClick={onToggleMaximize}
        >
          <button
            onClick={onClose}
            className={`w-2.5 h-2.5 rounded-full hover:brightness-125 transition cursor-pointer ${theme.glassy ? "bg-[#ff5f57]/80" : "bg-[#ff5f57]"}`}
          />
          <button
            onClick={onMinimize}
            className={`w-2.5 h-2.5 rounded-full hover:brightness-125 transition cursor-pointer ${theme.glassy ? "bg-[#febc2e]/80" : "bg-[#febc2e]"}`}
          />
          <button
            onClick={onToggleMaximize}
            className={`w-2.5 h-2.5 rounded-full hover:brightness-125 transition cursor-pointer ${theme.glassy ? "bg-[#28c840]/80" : "bg-[#28c840]"}`}
          />
          <span className={`ml-2 text-[10px] tracking-wider ${theme.glassy ? "text-white/40" : "text-[#555]"}`}>{win.title}</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {win.app === "terminal" && <TerminalApp onExit={onClose} />}
          {win.app === "files" && <FilesApp />}
          {win.app === "monitor" && <MonitorApp />}
          {win.app === "about" && <AboutApp />}
          {win.app === "notepad" && <NotepadApp />}
          {win.app === "analytics" && <AnalyticsApp />}
          {win.app === "music" && <MusicApp />}
          {win.app === "clock" && <ClockApp alarms={alarms} setAlarms={setAlarms} alarmIdRef={alarmIdRef} />}
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
      <div className={`px-3 py-2 ${theme.glassy ? "border-b border-white/5" : "border-b border-[#1a1a1a] bg-[#080808]"} flex items-center gap-2 text-[10px] shrink-0`}>
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
          <div className={`text-[10px] uppercase tracking-wider mb-1.5 ${theme.glassy ? "text-white/30" : "text-[#555]"}`}>CPU</div>
          <div className={`h-4 overflow-hidden border ${theme.glassy ? "border-white/10 bg-white/5 rounded" : "border-[#1a1a1a] bg-[#111]"}`}>
            <div
              className={`h-full transition-all duration-700 ${theme.glassy ? "rounded" : ""}`}
              style={{
                width: `${cpu}%`,
                background: cpu > 80 ? "#ff5f57" : `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
              }}
            />
          </div>
          <div className={`text-[11px] mt-1 ${theme.glassy ? "text-white/50" : "text-[#888]"}`}>{cpu}%</div>
        </div>
        <div>
          <div className={`text-[10px] uppercase tracking-wider mb-1.5 ${theme.glassy ? "text-white/30" : "text-[#555]"}`}>Memory</div>
          <div className={`h-4 overflow-hidden border ${theme.glassy ? "border-white/10 bg-white/5 rounded" : "border-[#1a1a1a] bg-[#111]"}`}>
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
        <div className={`text-[10px] uppercase tracking-wider mb-1.5 ${theme.glassy ? "text-white/30" : "text-[#555]"}`}>CPU History</div>
        <div className={`h-20 border flex items-end gap-px p-1 ${theme.glassy ? "border-white/10 bg-white/5 rounded-lg" : "border-[#1a1a1a] bg-[#080808]"}`}>
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
          <div className={`grid grid-cols-3 gap-2 px-3 py-1.5 text-[9px] uppercase tracking-wider ${theme.glassy ? "text-white/30 border-b border-white/5" : "text-[#555] border-b border-[#1a1a1a] bg-[#0f0f0f]"}`}>
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
      <div className={`px-3 py-1.5 ${theme.glassy ? "border-b border-white/5" : "border-b border-[#1a1a1a] bg-[#080808]"} text-[10px] text-[#555] shrink-0`}>
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

// ─── Analytics App ──────────────────────────────────────────────────────────

type AnalyticsTab = "visitors" | "web-analytics" | "speed";

function AnalyticsApp() {
  const { theme } = useContext(ThemeContext);
  const [tab, setTab] = useState<AnalyticsTab>("visitors");

  const tabs: { id: AnalyticsTab; label: string }[] = [
    { id: "visitors", label: "Visitors" },
    { id: "web-analytics", label: "Web Analytics" },
    { id: "speed", label: "Speed Insights" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className={`flex shrink-0 ${theme.glassy ? "border-b border-white/5" : "border-b border-[#1a1a1a] bg-[#080808]"}`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="px-4 py-2 text-[10px] uppercase tracking-wider transition cursor-pointer"
            style={{
              color: tab === t.id ? theme.primary : "#555",
              borderBottom: tab === t.id ? `1.5px solid ${theme.primary}` : "1.5px solid transparent",
              background: tab === t.id ? `rgba(${theme.primaryRgb},0.05)` : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {tab === "visitors" && <VisitorsPanel />}
        {tab === "web-analytics" && <VercelPlaceholderPanel theme={theme} title="Web Analytics" description="Connect Vercel API to view page views, unique visitors, top pages, referrers, and geographic data." />}
        {tab === "speed" && <VercelPlaceholderPanel theme={theme} title="Speed Insights" description="Connect Vercel API to view Core Web Vitals: FCP, LCP, CLS, FID, and TTFB metrics." />}
      </div>
    </div>
  );
}

function VercelPlaceholderPanel({ theme, title, description }: { theme: OSTheme; title: string; description: string }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-[320px] space-y-3">
        <div className="text-[13px] font-medium" style={{ color: theme.primary }}>{title}</div>
        <div className="text-[11px] text-[#666] leading-relaxed">{description}</div>
        <div className="text-[10px] px-3 py-2 border rounded" style={{ borderColor: `rgba(${theme.primaryRgb},0.2)`, color: theme.secondary }}>
          Requires VERCEL_TOKEN and VERCEL_PROJECT_ID in .env.local
        </div>
      </div>
    </div>
  );
}

// ─── Visitors Panel ─────────────────────────────────────────────────────────

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

function VisitorsPanel() {
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
      <div className={`px-3 py-2 ${theme.glassy ? "border-b border-white/5" : "border-b border-[#1a1a1a] bg-[#080808]"} flex items-center gap-4 shrink-0`}>
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
          className={`border text-[10px] text-[#ccc] px-2 py-1 w-32 outline-none ${theme.glassy ? "bg-white/5 border-white/10 rounded" : "bg-[#111] border-[#1a1a1a]"}`}
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
      className={`fixed bottom-0 left-0 right-0 flex items-center px-2 gap-1 z-[9998] ${theme.glassy ? "h-11 mx-2 mb-1.5 rounded-2xl backdrop-blur-2xl border border-white/10" : "h-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-[#1a1a1a]"}`}
      style={theme.glassy ? { background: "rgba(20,20,30,0.4)", boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)" } : undefined}
    >
      {/* Start button */}
      <button
        className={`h-7 px-2.5 flex items-center gap-1.5 transition cursor-pointer ${theme.glassy ? "hover:bg-white/10 rounded-lg" : "hover:bg-white/5 rounded"}`}
        onClick={() => onOpen("terminal")}
      >
        <svg width="16" height="11" viewBox="0 0 120 80" fill="none">
          <path d="M20 10 L20 50 Q20 65 35 65 L42 65" stroke={theme.primary} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M100 15 L75 15 Q60 15 60 30 L60 50 Q60 65 75 65 L100 65" stroke={theme.secondary} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="50" cy="40" r="4" fill={theme.primary} />
        </svg>
      </button>

      <div className={`w-px h-5 mx-1 ${theme.glassy ? "bg-white/10" : "bg-[#1a1a1a]"}`} />

      {/* Window list */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {windows.map((win) => (
          <button
            key={win.id}
            data-taskbar-id={win.id}
            onClick={() => onFocus(win.id)}
            className={`h-7 px-3 text-[10px] tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
              theme.glassy
                ? `rounded-lg ${win.minimized ? "text-white/30 hover:bg-white/8" : "text-white/70 bg-white/10"}`
                : `rounded ${win.minimized ? "text-[#444] hover:bg-white/5" : "text-[#888] bg-white/5"}`
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
        <span className={`text-[10px] tabular-nums ${theme.glassy ? "text-white/40" : "text-[#555]"}`}>{time}</span>
      </div>
    </div>
  );
}

// ─── Mini Player (taskbar widget) ────────────────────────────────────────────

const MINI_PLAYER_W = 300;
const MINI_PLAYER_GRID = 192;
const MINI_PLAYER_TASKBAR_H = TASKBAR_H;

function MiniPlayer({
  isPlaying,
  currentTrack,
  progress,
  duration,
  onTogglePlay,
  onPrev,
  onNext,
  onRestore,
}: {
  isPlaying: boolean;
  currentTrack: MusicTrack | null;
  progress: number;
  duration: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRestore: () => void;
}) {
  const { theme } = useContext(ThemeContext);
  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  // Snap to grid points + screen edges, pick nearest
  const snapToGrid = (v: number, max: number) => {
    const points = [DESKTOP_PAD];
    for (let p = DESKTOP_PAD + MINI_PLAYER_GRID; p < max; p += MINI_PLAYER_GRID) points.push(p);
    points.push(max);
    let best = points[0], bestDist = Math.abs(v - best);
    for (const p of points) {
      const d = Math.abs(v - p);
      if (d < bestDist) { best = p; bestDist = d; }
    }
    return best;
  };

  const DRAG_THRESHOLD = 5;

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; active: boolean } | null>(null);
  const wasDragRef = useRef(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  // Default position: bottom-right above taskbar with padding
  const resolvedPos = pos ?? {
    x: (typeof window !== "undefined" ? window.innerWidth : 1920) - MINI_PLAYER_W - DESKTOP_PAD,
    y: (typeof window !== "undefined" ? window.innerHeight : 1080) - MINI_PLAYER_TASKBAR_H - (widgetRef.current?.offsetHeight ?? 140) - DESKTOP_PAD,
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      // Only start moving after exceeding threshold
      if (!d.active && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      d.active = true;
      setDragging(true);
      const rawX = d.origX + dx;
      const rawY = d.origY + dy;
      const widgetH = widgetRef.current?.offsetHeight ?? 140;
      const maxX = window.innerWidth - MINI_PLAYER_W - DESKTOP_PAD;
      const maxY = window.innerHeight - MINI_PLAYER_TASKBAR_H - widgetH - DESKTOP_PAD;
      setPos({
        x: Math.max(DESKTOP_PAD, Math.min(rawX, maxX)),
        y: Math.max(DESKTOP_PAD, Math.min(rawY, maxY)),
      });
    };
    const onMouseUp = () => {
      if (!dragRef.current) return;
      wasDragRef.current = dragRef.current.active;
      const wasDrag = dragRef.current.active;
      dragRef.current = null;
      setDragging(false);
      // Reset wasDragRef after click event has had a chance to fire
      requestAnimationFrame(() => { wasDragRef.current = false; });
      if (wasDrag) {
        // Snap to grid on release
        setPos((prev) => {
          if (!prev) return prev;
          const widgetH = widgetRef.current?.offsetHeight ?? 140;
          const maxX = window.innerWidth - MINI_PLAYER_W - DESKTOP_PAD;
          const maxY = window.innerHeight - MINI_PLAYER_TASKBAR_H - widgetH - DESKTOP_PAD;
          return {
            x: snapToGrid(prev.x, maxX),
            y: snapToGrid(prev.y, maxY),
          };
        });
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragStart = (e: React.MouseEvent) => {
    // Don't interfere with button clicks initially — just record start
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: resolvedPos.x,
      origY: resolvedPos.y,
      active: false,
    };
  };

  return (
    <div
      ref={widgetRef}
      className="fixed z-[9999] w-[300px] overflow-hidden rounded-xl select-none cursor-grab active:cursor-grabbing"
      style={{
        left: resolvedPos.x,
        top: resolvedPos.y,
        boxShadow: `0 12px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06)`,
        transition: dragging ? "none" : "left 0.2s ease, top 0.2s ease",
      }}
      onMouseDown={handleDragStart}
      onClickCapture={(e) => { if (wasDragRef.current) { e.stopPropagation(); e.preventDefault(); } }}
    >
      <div className="relative">
        {/* Thumbnail background — blurred + translucent */}
        {currentTrack?.thumbnail && (
          <img
            src={currentTrack.thumbnail}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-125 pointer-events-none"
            style={{ opacity: 0.4 }}
          />
        )}
        <div className="absolute inset-0 backdrop-blur-lg bg-black/40 pointer-events-none" />

        <div className="relative flex flex-col gap-3 px-4 pt-4 pb-3">
          {/* Track info — click to restore */}
          <button
            className="text-left cursor-pointer"
            onClick={onRestore}
            title="Open player"
          >
            <div className="text-[12px] text-white font-medium truncate leading-tight drop-shadow-md">
              {currentTrack?.title || "No track"}
            </div>
            <div className="text-[10px] text-white/60 truncate mt-0.5 drop-shadow-sm">
              {currentTrack?.channel || ""}
            </div>
          </button>

          {/* Progress bar */}
          <div className="w-full">
            <div className="w-full h-[3px] bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-none"
                style={{
                  width: `${progressPct}%`,
                  background: theme.primary,
                  boxShadow: `0 0 8px rgba(${theme.primaryRgb},0.5)`,
                }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
              onClick={onPrev}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button
              className="w-11 h-11 flex items-center justify-center transition hover:scale-105 cursor-pointer rounded-full bg-white/20 backdrop-blur-sm"
              style={{ boxShadow: `0 0 20px rgba(${theme.primaryRgb},0.25)` }}
              onClick={onTogglePlay}
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
              onClick={onNext}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Music App ───────────────────────────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement | null, opts: object) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(vol: number): void;
  getPlayerState(): number;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

interface YTPlaylistItem {
  id: string;
  snippet: {
    title: string;
    thumbnails?: { medium?: { url: string }; default?: { url: string } };
    contentDetails?: { itemCount: number };
  };
  contentDetails: { itemCount: number };
}

// ─── Clock App ───────────────────────────────────────────────────────────────

type ClockTab = "clock" | "stopwatch" | "timer" | "alarms";

function ClockApp({ alarms, setAlarms, alarmIdRef }: {
  alarms: { time: string; enabled: boolean; id: number }[];
  setAlarms: (update: React.SetStateAction<{ time: string; enabled: boolean; id: number }[]>) => void;
  alarmIdRef: React.MutableRefObject<number>;
}) {
  const { theme } = useContext(ThemeContext);
  const [tab, setTab] = useState<ClockTab>("clock");
  const [now, setNow] = useState(new Date());

  // Stopwatch
  const [swRunning, setSwRunning] = useState(false);
  const [swElapsed, setSwElapsed] = useState(0);
  const [swLaps, setSwLaps] = useState<number[]>([]);
  const swStart = useRef<number>(0);
  const swRaf = useRef<number>(0);

  // Timer
  const [tmTotal, setTmTotal] = useState(300);
  const [tmLeft, setTmLeft] = useState(300);
  const [tmRunning, setTmRunning] = useState(false);
  const [tmDone, setTmDone] = useState(false);
  const [tmInput, setTmInput] = useState("5:00");

  const [alarmInput, setAlarmInput] = useState("08:00");

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Stopwatch rAF
  useEffect(() => {
    if (!swRunning) return;
    swStart.current = performance.now() - swElapsed;
    const tick = () => {
      setSwElapsed(performance.now() - swStart.current);
      swRaf.current = requestAnimationFrame(tick);
    };
    swRaf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(swRaf.current);
  }, [swRunning]); // eslint-disable-line react-hooks/exhaustive-deps

  // Timer countdown
  useEffect(() => {
    if (!tmRunning) return;
    const id = setInterval(() => {
      setTmLeft((prev) => {
        if (prev <= 1) {
          setTmRunning(false);
          setTmDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [tmRunning]);

  const fmtMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };

  const fmtSec = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const parseTimerInput = (v: string) => {
    const parts = v.split(":").map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts[0] * 60 + parts[1];
    if (parts.length === 1 && !isNaN(parts[0])) return parts[0] * 60;
    return 300;
  };

  const tabs: { id: ClockTab; label: string }[] = [
    { id: "clock", label: "Clock" },
    { id: "stopwatch", label: "Stopwatch" },
    { id: "timer", label: "Timer" },
    { id: "alarms", label: "Alarms" },
  ];

  return (
    <div className="h-full flex flex-col relative">
      {/* Tab bar */}
      <div className={`flex shrink-0 ${theme.glassy ? "border-b border-white/5" : "border-b border-[#1a1a1a] bg-[#080808]"}`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 text-[10px] uppercase tracking-wider transition cursor-pointer"
            style={{
              color: tab === t.id ? theme.primary : "#555",
              borderBottom: tab === t.id ? `2px solid ${theme.primary}` : "2px solid transparent",
              background: tab === t.id ? (theme.glassy ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)") : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto">
        {/* Clock */}
        {tab === "clock" && (
          <div className="flex flex-col items-center gap-4">
            <div className="text-5xl font-light tabular-nums tracking-wider" style={{ color: theme.primary }}>
              {now.toLocaleTimeString("en-GB")}
            </div>
            <div className="text-sm" style={{ color: "#666" }}>
              {now.toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
            {/* Analog clock face */}
            <svg width="140" height="140" viewBox="0 0 140 140" className="mt-2">
              <circle cx="70" cy="70" r="65" fill="none" stroke={theme.glassy ? "rgba(255,255,255,0.1)" : "#1a1a1a"} strokeWidth="2" />
              {[...Array(12)].map((_, i) => {
                const a = (i * 30 - 90) * (Math.PI / 180);
                return <line key={i} x1={70 + 55 * Math.cos(a)} y1={70 + 55 * Math.sin(a)} x2={70 + 60 * Math.cos(a)} y2={70 + 60 * Math.sin(a)} stroke="#555" strokeWidth="2" />;
              })}
              {/* Hour hand */}
              {(() => {
                const ha = ((now.getHours() % 12) * 30 + now.getMinutes() * 0.5 - 90) * (Math.PI / 180);
                return <line x1="70" y1="70" x2={70 + 32 * Math.cos(ha)} y2={70 + 32 * Math.sin(ha)} stroke={theme.primary} strokeWidth="3" strokeLinecap="round" />;
              })()}
              {/* Minute hand */}
              {(() => {
                const ma = (now.getMinutes() * 6 - 90) * (Math.PI / 180);
                return <line x1="70" y1="70" x2={70 + 45 * Math.cos(ma)} y2={70 + 45 * Math.sin(ma)} stroke={theme.primary} strokeWidth="2" strokeLinecap="round" />;
              })()}
              {/* Second hand */}
              {(() => {
                const sa = (now.getSeconds() * 6 - 90) * (Math.PI / 180);
                return <line x1="70" y1="70" x2={70 + 50 * Math.cos(sa)} y2={70 + 50 * Math.sin(sa)} stroke={theme.secondary} strokeWidth="1" strokeLinecap="round" />;
              })()}
              <circle cx="70" cy="70" r="3" fill={theme.primary} />
            </svg>
          </div>
        )}

        {/* Stopwatch */}
        {tab === "stopwatch" && (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="text-4xl font-light tabular-nums tracking-wider" style={{ color: theme.primary }}>
              {fmtMs(swElapsed)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSwRunning(!swRunning)}
                className="px-4 py-1.5 text-[11px] uppercase tracking-wider rounded transition cursor-pointer"
                style={{ background: swRunning ? "rgba(255,95,87,0.2)" : `rgba(${theme.primaryRgb},0.15)`, color: swRunning ? "#ff5f57" : theme.primary, border: `1px solid ${swRunning ? "rgba(255,95,87,0.3)" : `rgba(${theme.primaryRgb},0.3)`}` }}
              >
                {swRunning ? "Stop" : swElapsed > 0 ? "Resume" : "Start"}
              </button>
              {swRunning && (
                <button
                  onClick={() => setSwLaps((prev) => [swElapsed, ...prev])}
                  className="px-4 py-1.5 text-[11px] uppercase tracking-wider rounded transition cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#888", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Lap
                </button>
              )}
              {!swRunning && swElapsed > 0 && (
                <button
                  onClick={() => { setSwElapsed(0); setSwLaps([]); }}
                  className="px-4 py-1.5 text-[11px] uppercase tracking-wider rounded transition cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#888", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  Reset
                </button>
              )}
            </div>
            {swLaps.length > 0 && (
              <div className="w-full max-h-32 overflow-auto mt-2">
                {swLaps.map((lap, i) => (
                  <div key={i} className="flex justify-between px-4 py-1 text-[11px]" style={{ color: "#888", borderBottom: `1px solid ${theme.glassy ? "rgba(255,255,255,0.05)" : "#1a1a1a"}` }}>
                    <span>Lap {swLaps.length - i}</span>
                    <span className="tabular-nums" style={{ color: theme.primary }}>{fmtMs(i === 0 ? lap : lap - swLaps[i - 1])}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timer */}
        {tab === "timer" && (
          <div className="flex flex-col items-center gap-4">
            {tmDone ? (
              <div className="flex flex-col items-center gap-3">
                <div className="text-3xl animate-pulse" style={{ color: theme.secondary }}>Time&apos;s up!</div>
                <button
                  onClick={() => { setTmDone(false); setTmLeft(tmTotal); }}
                  className="px-4 py-1.5 text-[11px] uppercase tracking-wider rounded transition cursor-pointer"
                  style={{ background: `rgba(${theme.primaryRgb},0.15)`, color: theme.primary, border: `1px solid rgba(${theme.primaryRgb},0.3)` }}
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <>
                <div className="text-4xl font-light tabular-nums tracking-wider" style={{ color: tmLeft < 10 ? "#ff5f57" : theme.primary }}>
                  {fmtSec(tmLeft)}
                </div>
                {/* Progress ring */}
                <svg width="100" height="100" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke={theme.glassy ? "rgba(255,255,255,0.08)" : "#1a1a1a"} strokeWidth="4" />
                  <circle
                    cx="50" cy="50" r="44" fill="none" stroke={theme.primary} strokeWidth="4" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - (tmTotal > 0 ? tmLeft / tmTotal : 0))}
                    transform="rotate(-90 50 50)"
                    style={{ transition: "stroke-dashoffset 1s linear" }}
                  />
                </svg>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTmRunning(!tmRunning)}
                    className="px-4 py-1.5 text-[11px] uppercase tracking-wider rounded transition cursor-pointer"
                    style={{ background: tmRunning ? "rgba(255,95,87,0.2)" : `rgba(${theme.primaryRgb},0.15)`, color: tmRunning ? "#ff5f57" : theme.primary, border: `1px solid ${tmRunning ? "rgba(255,95,87,0.3)" : `rgba(${theme.primaryRgb},0.3)`}` }}
                  >
                    {tmRunning ? "Pause" : tmLeft < tmTotal ? "Resume" : "Start"}
                  </button>
                  <button
                    onClick={() => { setTmRunning(false); setTmLeft(tmTotal); }}
                    className="px-4 py-1.5 text-[11px] uppercase tracking-wider rounded transition cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.05)", color: "#888", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    Reset
                  </button>
                </div>
                {!tmRunning && tmLeft === tmTotal && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      value={tmInput}
                      onChange={(e) => setTmInput(e.target.value)}
                      onBlur={() => { const s = parseTimerInput(tmInput); setTmTotal(s); setTmLeft(s); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { const s = parseTimerInput(tmInput); setTmTotal(s); setTmLeft(s); } }}
                      className={`w-20 text-center text-[12px] px-2 py-1 outline-none rounded ${theme.glassy ? "bg-white/5 border border-white/10" : "bg-[#111] border border-[#1a1a1a]"}`}
                      style={{ color: theme.primary, caretColor: theme.primary }}
                      placeholder="M:SS"
                    />
                    <span className="text-[10px]" style={{ color: "#555" }}>min:sec</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Alarms */}
        {tab === "alarms" && (
          <div className="flex flex-col gap-3 w-full">
            <div className="flex gap-2">
              <input
                value={alarmInput}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9:]/g, "");
                  if (v.length <= 5) setAlarmInput(v);
                }}
                onBlur={() => {
                  const m = alarmInput.match(/^(\d{1,2}):(\d{2})$/);
                  if (!m || +m[1] > 23 || +m[2] > 59) setAlarmInput("08:00");
                  else setAlarmInput(`${m[1].padStart(2, "0")}:${m[2]}`);
                }}
                placeholder="HH:MM"
                maxLength={5}
                className={`w-24 text-center text-[12px] px-3 py-1.5 outline-none rounded ${theme.glassy ? "bg-white/5 border border-white/10" : "bg-[#111] border border-[#1a1a1a]"}`}
                style={{ color: theme.primary, caretColor: theme.primary }}
              />
              <button
                onClick={() => {
                  setAlarms((prev) => [...prev, { time: alarmInput, enabled: true, id: ++alarmIdRef.current }]);
                }}
                className="px-3 py-1.5 text-[11px] uppercase tracking-wider rounded transition cursor-pointer"
                style={{ background: `rgba(${theme.primaryRgb},0.15)`, color: theme.primary, border: `1px solid rgba(${theme.primaryRgb},0.3)` }}
              >
                Add
              </button>
            </div>
            {alarms.length === 0 && (
              <div className="text-[11px] text-center py-6" style={{ color: "#555" }}>No alarms set</div>
            )}
            {alarms.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-3 py-2 rounded"
                style={{ background: theme.glassy ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)", border: `1px solid ${theme.glassy ? "rgba(255,255,255,0.06)" : "#1a1a1a"}` }}
              >
                <span className="text-lg tabular-nums" style={{ color: a.enabled ? theme.primary : "#555" }}>{a.time}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAlarms((prev) => prev.map((x) => x.id === a.id ? { ...x, enabled: !x.enabled } : x))}
                    className="w-8 h-4 rounded-full transition cursor-pointer relative"
                    style={{ background: a.enabled ? `rgba(${theme.primaryRgb},0.3)` : "rgba(255,255,255,0.1)" }}
                  >
                    <div
                      className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                      style={{ background: a.enabled ? theme.primary : "#555", left: a.enabled ? 16 : 2 }}
                    />
                  </button>
                  <button
                    onClick={() => setAlarms((prev) => prev.filter((x) => x.id !== a.id))}
                    className="text-[10px] cursor-pointer transition hover:opacity-80"
                    style={{ color: "#ff5f57" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Music App ────────────────────────────────────────────────────────────────

function MusicApp() {
  const { theme } = useContext(ThemeContext);
  const musicSync = useContext(MusicSyncContext);

  type Status = "checking" | "disconnected" | "ready" | "error";
  const [status, setStatus] = useState<Status>("checking");
  const [playlists, setPlaylists] = useState<YTPlaylistItem[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedPlaylistTitle, setSelectedPlaylistTitle] = useState("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [view, setView] = useState<"player" | "playlist">("player");
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [defaultPlaylistId, setDefaultPlaylistId] = useState<string | null>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentIndexRef = useRef(0);
  const tracksRef = useRef<MusicTrack[]>([]);
  const volumeRef = useRef(80);

  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Sync state to mini-player via context
  const currentTrack = tracks[currentIndex] ?? null;
  useEffect(() => { musicSync.reportState({ isPlaying, currentTrack, progress, duration }); }, [isPlaying, currentTrack, progress, duration, musicSync]);

  // Check connection on mount + load saved default playlist
  useEffect(() => {
    const savedDefault = localStorage.getItem("jcos_yt_default_playlist");
    if (savedDefault) {
      try {
        const { id, title } = JSON.parse(savedDefault);
        setDefaultPlaylistId(id);
        fetch("/api/youtube/playlists")
          .then(async (res) => {
            if (res.status === 401) { setStatus("disconnected"); return; }
            if (!res.ok) { setStatus("error"); return; }
            const data = await res.json();
            setPlaylists(data.items || []);
            setStatus("ready");
            loadPlaylist(id, title);
          })
          .catch(() => setStatus("error"));
      } catch {
        localStorage.removeItem("jcos_yt_default_playlist");
        fetchPlaylists();
      }
    } else {
      fetchPlaylists();
    }

    function fetchPlaylists() {
      fetch("/api/youtube/playlists")
        .then(async (res) => {
          if (res.status === 401) { setStatus("disconnected"); return; }
          if (!res.ok) { setStatus("error"); return; }
          const data = await res.json();
          setPlaylists(data.items || []);
          setStatus("ready");
        })
        .catch(() => setStatus("error"));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load YouTube IFrame API once + create player container outside React tree
  useEffect(() => {
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;pointer-events:none;";
    document.body.appendChild(container);
    playerContainerRef.current = container;

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }

    return () => {
      // Destroy player first, then remove container — order matters
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      try { playerRef.current?.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
      playerContainerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const createPlayer = useCallback((videoId: string) => {
    const container = playerContainerRef.current;
    if (!container || !window.YT?.Player) return;

    if (playerRef.current) {
      playerRef.current.loadVideoById(videoId);
      return;
    }

    playerRef.current = new window.YT.Player(container, {
      videoId,
      height: "1",
      width: "1",
      playerVars: { autoplay: 1, controls: 0, playsinline: 1 },
      events: {
        onReady: (e: { target: YTPlayer }) => {
          e.target.setVolume(volumeRef.current);
          setDuration(e.target.getDuration());
        },
        onStateChange: (e: { data: number; target: YTPlayer }) => {
          const s = window.YT.PlayerState;
          if (e.data === s.PLAYING) {
            setIsPlaying(true);
            setDuration(e.target.getDuration());
            clearProgressInterval();
            progressIntervalRef.current = setInterval(() => {
              setProgress(e.target.getCurrentTime());
              setDuration(e.target.getDuration());
            }, 500);
          } else if (e.data === s.PAUSED) {
            setIsPlaying(false);
            clearProgressInterval();
          } else if (e.data === s.ENDED) {
            setIsPlaying(false);
            clearProgressInterval();
            const nextIdx = (currentIndexRef.current + 1) % tracksRef.current.length;
            const nextTrack = tracksRef.current[nextIdx];
            if (nextTrack) {
              e.target.loadVideoById(nextTrack.id);
              setCurrentIndex(nextIdx);
              setProgress(0);
            }
          }
        },
      },
    });
  }, [clearProgressInterval]);

  const loadPlaylist = async (playlistId: string, title: string) => {
    setLoadingTracks(true);
    setSelectedPlaylistId(playlistId);
    setSelectedPlaylistTitle(title);
    setView("player");
    // Remember last playlist so it auto-loads next time
    localStorage.setItem("jcos_yt_default_playlist", JSON.stringify({ id: playlistId, title }));
    setDefaultPlaylistId(playlistId);
    try {
      const res = await fetch(`/api/youtube/playlist?id=${encodeURIComponent(playlistId)}`);
      const data = await res.json();
      const items: MusicTrack[] = (data.items || [])
        .filter((item: { snippet?: { resourceId?: { videoId?: string } } }) => item.snippet?.resourceId?.videoId)
        .map((item: { snippet: { resourceId: { videoId: string }; title: string; videoOwnerChannelTitle?: string; thumbnails?: { medium?: { url: string }; default?: { url: string } } } }) => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          channel: item.snippet.videoOwnerChannelTitle || "",
          thumbnail:
            item.snippet.thumbnails?.medium?.url ||
            item.snippet.thumbnails?.default?.url ||
            "",
        }));
      setTracks(items);
      setCurrentIndex(0);
      setProgress(0);
      setDuration(0);
      if (items[0]) {
        if (window.YT?.Player) {
          createPlayer(items[0].id);
        } else {
          const prev = window.onYouTubeIframeAPIReady;
          window.onYouTubeIframeAPIReady = () => {
            prev?.();
            createPlayer(items[0].id);
          };
        }
      }
    } finally {
      setLoadingTracks(false);
    }
  };


  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (playerRef.current.getPlayerState?.() === window.YT?.PlayerState?.PLAYING) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, []);

  const playNext = useCallback(() => {
    const next = (currentIndexRef.current + 1) % tracksRef.current.length;
    const track = tracksRef.current[next];
    if (track) { playerRef.current?.loadVideoById(track.id); setProgress(0); }
    setCurrentIndex(next);
  }, []);

  const playPrev = useCallback(() => {
    const prev = (currentIndexRef.current - 1 + tracksRef.current.length) % tracksRef.current.length;
    const track = tracksRef.current[prev];
    if (track) { playerRef.current?.loadVideoById(track.id); setProgress(0); }
    setCurrentIndex(prev);
  }, []);

  // Register controls for mini-player
  useEffect(() => { musicSync.registerControls({ togglePlay, next: playNext, prev: playPrev }); }, [togglePlay, playNext, playPrev, musicSync]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newTime = ((e.clientX - rect.left) / rect.width) * duration;
    playerRef.current.seekTo(newTime, true);
    setProgress(newTime);
  };

  const handleVolume = (val: number) => {
    setVolume(val);
    playerRef.current?.setVolume(val);
  };

  const handleDisconnect = async () => {
    await fetch("/api/youtube/disconnect", { method: "POST" });
    setStatus("disconnected");
    setPlaylists([]);
    setTracks([]);
    setSelectedPlaylistId(null);
    clearProgressInterval();
    playerRef.current?.destroy();
    playerRef.current = null;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  // ── Render helpers ──────────────────────────────────────────────────────────

  if (status === "checking") {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-[11px] animate-pulse" style={{ color: theme.primary }}>Connecting...</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="text-2xl">⚠</span>
        <p className="text-[11px] text-[#888]">Something went wrong.</p>
        <button
          className="text-[10px] px-3 py-1.5 border transition hover:opacity-80 cursor-pointer"
          style={{ borderColor: theme.primary, color: theme.primary }}
          onClick={() => setStatus("checking")}
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 p-6 text-center">
        {/* Hidden YT container lives here always */}

        <div>
          <div className="text-3xl mb-3" style={{ color: theme.primary, textShadow: `0 0 20px rgba(${theme.primaryRgb},0.4)` }}>♫</div>
          <div className="text-[13px] text-[#e8e8e8] mb-1">YouTube Music</div>
          <div className="text-[10px] text-[#555]">Connect your account to play from your playlists</div>
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2 border transition hover:opacity-80 cursor-pointer text-[11px]"
          style={{ borderColor: theme.primary, color: theme.primary }}
          onClick={() => { window.location.href = "/api/youtube/auth"; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
          Connect YouTube
        </button>

        <p className="text-[9px] text-[#444] max-w-[240px]">
          You&apos;ll be redirected to Google to authorize read-only access to your YouTube playlists.
        </p>
      </div>
    );
  }

  // Connected — show playlist picker or player
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header bar */}
      <div className={`px-3 py-2 ${theme.glassy ? "border-b border-white/5" : "border-b border-[#1a1a1a] bg-[#080808]"} flex items-center gap-2 shrink-0`}>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: theme.primary }}>♫ YouTube Music</span>
        {selectedPlaylistId && (
          <>
            <span className="text-[#333] text-[10px]">/</span>
            <span className="text-[10px] text-[#666] truncate flex-1">{selectedPlaylistTitle}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {selectedPlaylistId && (
            <button
              className="text-[9px] px-2 py-0.5 border border-[#1a1a1a] text-[#555] hover:text-[#888] transition cursor-pointer"
              onClick={() => { setSelectedPlaylistId(null); setTracks([]); setView("player"); }}
            >
              Playlists
            </button>
          )}
          <button
            className="text-[9px] text-[#333] hover:text-[#ff5f57] transition cursor-pointer"
            onClick={handleDisconnect}
            title="Disconnect YouTube"
          >
            ✕ Disconnect
          </button>
        </div>
      </div>

      {/* No playlist selected — show picker */}
      {!selectedPlaylistId && (
        <div className="flex-1 overflow-y-auto p-3" style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1a1a #0a0a0a" }}>
          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-3">Your Playlists</div>
          {playlists.length === 0 ? (
            <div className="text-[11px] text-[#444] text-center py-8">No playlists found.</div>
          ) : (
            <div className="space-y-1">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  role="button"
                  tabIndex={0}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition text-left cursor-pointer border border-transparent hover:border-[#1a1a1a]"
                  onClick={() => loadPlaylist(pl.id, pl.snippet.title)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") loadPlaylist(pl.id, pl.snippet.title); }}
                >
                  {pl.snippet.thumbnails?.medium?.url ? (
                    <img src={pl.snippet.thumbnails.medium.url} alt="" className="w-10 h-7 object-cover shrink-0 opacity-80" />
                  ) : (
                    <div className="w-10 h-7 bg-[#111] border border-[#1a1a1a] flex items-center justify-center shrink-0">
                      <span className="text-[#333] text-xs">♫</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] text-[#aaa] truncate">{pl.snippet.title}</div>
                    <div className="text-[9px] text-[#444]">{pl.contentDetails?.itemCount ?? "?"} videos</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="text-[9px] px-1.5 py-0.5 border transition cursor-pointer"
                      style={{
                        borderColor: defaultPlaylistId === pl.id ? theme.primary : "#2a2a2a",
                        color: defaultPlaylistId === pl.id ? theme.primary : "#444",
                      }}
                      title={defaultPlaylistId === pl.id ? "Clear default" : "Set as default"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (defaultPlaylistId === pl.id) {
                          localStorage.removeItem("jcos_yt_default_playlist");
                          setDefaultPlaylistId(null);
                        } else {
                          const val = JSON.stringify({ id: pl.id, title: pl.snippet.title });
                          localStorage.setItem("jcos_yt_default_playlist", val);
                          setDefaultPlaylistId(pl.id);
                        }
                      }}
                    >
                      {defaultPlaylistId === pl.id ? "★ default" : "☆"}
                    </button>
                    <span style={{ color: theme.primary }} className="text-[10px]">▶</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Playlist selected — player + track list toggle */}
      {selectedPlaylistId && (
        <>
          {/* View toggle */}
          <div className="flex border-b border-[#1a1a1a] shrink-0">
            {(["player", "playlist"] as const).map((v) => (
              <button
                key={v}
                className="flex-1 py-1.5 text-[9px] uppercase tracking-wider transition cursor-pointer"
                style={{
                  color: view === v ? theme.primary : "#444",
                  borderBottom: view === v ? `1px solid ${theme.primary}` : "1px solid transparent",
                  marginBottom: "-1px",
                }}
                onClick={() => setView(v)}
              >
                {v === "player" ? "Now Playing" : "Tracklist"}
              </button>
            ))}
          </div>

          {/* Loading state */}
          {loadingTracks && (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-[11px] animate-pulse" style={{ color: theme.primary }}>Loading tracks...</span>
            </div>
          )}

          {/* Player view */}
          {!loadingTracks && view === "player" && (
            <div className="flex-1 flex flex-col items-center justify-between p-5 gap-4">
              {/* Album art */}
              <div className="flex-1 flex items-center justify-center w-full">
                {currentTrack?.thumbnail ? (
                  <img
                    src={currentTrack.thumbnail}
                    alt=""
                    className="max-h-[160px] object-contain"
                    style={{ boxShadow: `0 0 40px rgba(${theme.primaryRgb},0.15)` }}
                  />
                ) : (
                  <div
                    className="w-36 h-24 border border-[#1a1a1a] flex items-center justify-center"
                    style={{ boxShadow: `0 0 40px rgba(${theme.primaryRgb},0.1)` }}
                  >
                    <span className="text-4xl" style={{ color: `rgba(${theme.primaryRgb},0.3)` }}>♫</span>
                  </div>
                )}
              </div>

              {/* Track info */}
              <div className="w-full text-center">
                <div className="text-[12px] text-[#e8e8e8] truncate leading-tight mb-0.5">
                  {currentTrack?.title || "No track"}
                </div>
                <div className="text-[10px] text-[#555] truncate">{currentTrack?.channel || ""}</div>
              </div>

              {/* Progress bar */}
              <div className="w-full space-y-1">
                <div
                  className="w-full h-1 bg-[#1a1a1a] cursor-pointer relative"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full transition-none"
                    style={{
                      width: `${progressPct}%`,
                      background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
                      boxShadow: `0 0 6px rgba(${theme.primaryRgb},0.4)`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-[#444] tabular-nums">
                  <span>{fmt(progress)}</span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-6">
                <button
                  className="text-[#555] hover:brightness-200 transition cursor-pointer text-lg leading-none"
                  onClick={() => {
                    const prev = (currentIndex - 1 + tracks.length) % tracks.length;
                    const track = tracks[prev];
                    if (track) { playerRef.current?.loadVideoById(track.id); setProgress(0); }
                    setCurrentIndex(prev);
                  }}
                >
                  ⏮
                </button>
                <button
                  className="w-9 h-9 border flex items-center justify-center transition hover:opacity-80 cursor-pointer"
                  style={{ borderColor: theme.primary, color: theme.primary, boxShadow: `0 0 12px rgba(${theme.primaryRgb},0.2)` }}
                  onClick={togglePlay}
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>
                <button
                  className="text-[#555] hover:brightness-200 transition cursor-pointer text-lg leading-none"
                  onClick={playNext}
                >
                  ⏭
                </button>
              </div>

              {/* Volume */}
              <div className="w-full flex items-center gap-2">
                <span className="text-[10px] text-[#444]">🔈</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => handleVolume(Number(e.target.value))}
                  className="flex-1 h-1 appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(90deg, ${theme.primary} ${volume}%, #1a1a1a ${volume}%)`,
                    outline: "none",
                  }}
                />
                <span className="text-[10px] text-[#444] tabular-nums w-6">{volume}</span>
              </div>
            </div>
          )}

          {/* Tracklist view */}
          {!loadingTracks && view === "playlist" && (
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#1a1a1a #0a0a0a" }}>
              {tracks.map((track, i) => (
                <button
                  key={`${track.id}-${i}`}
                  className="w-full flex items-center gap-3 px-3 py-2 border-b border-[#0f0f0f] hover:bg-white/5 transition text-left cursor-pointer"
                  style={{ background: i === currentIndex ? `rgba(${theme.primaryRgb},0.07)` : undefined }}
                  onClick={() => {
                    playerRef.current?.loadVideoById(track.id);
                    setCurrentIndex(i);
                    setProgress(0);
                    setView("player");
                  }}
                >
                  {i === currentIndex && isPlaying ? (
                    <span className="text-[10px] w-5 text-center shrink-0" style={{ color: theme.primary }}>♫</span>
                  ) : (
                    <span className="text-[9px] w-5 text-center shrink-0 text-[#444]">{i + 1}</span>
                  )}
                  {track.thumbnail ? (
                    <img src={track.thumbnail} alt="" className="w-8 h-6 object-cover shrink-0 opacity-70" />
                  ) : (
                    <div className="w-8 h-6 bg-[#111] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] truncate" style={{ color: i === currentIndex ? theme.primary : "#aaa" }}>
                      {track.title}
                    </div>
                    <div className="text-[9px] text-[#444] truncate">{track.channel}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
