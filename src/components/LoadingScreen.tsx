"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useLoading } from "./LoadingContext";

const bootLines = [
  { text: "BIOS v3.2.1 — POST check complete", delay: 0 },
  { text: "Memory: 32768 MB OK", delay: 150 },
  { text: "Detecting hardware...", delay: 300 },
  { text: "GPU: RTX 4090 — OK", delay: 500 },
  { text: "Network: eth0 connected", delay: 650 },
  { text: "", delay: 800 },
  { text: "$ mount /dev/sda1 /portfolio", delay: 900 },
  { text: "$ loading modules...", delay: 1100 },
  { text: "  [+] react@19.2.3", delay: 1250 },
  { text: "  [+] next@16.1.6", delay: 1400 },
  { text: "  [+] three@latest", delay: 1500 },
  { text: "  [+] creativity@∞", delay: 1600 },
  { text: "  [+] coffee@☕", delay: 1700 },
  { text: "", delay: 1800 },
  { text: "$ initializing portfolio...", delay: 1900 },
  { text: "  → compiling assets", delay: 2050 },
  { text: "  → establishing connections", delay: 2200 },
  { text: "  → deploying experience", delay: 2350 },
  { text: "", delay: 2500 },
  { text: "$ echo 'Welcome'", delay: 2600 },
  { text: "READY.", delay: 2800 },
];

const launchCommands: Record<string, string[]> = {
  "npm start": ["Launching portfolio...", "✓ Session established."],
  "sudo enter": ["[sudo] password accepted.", "✓ Access granted."],
  "sudo launch": ["[sudo] igniting thrusters...", "✓ Portfolio deployed."],
};

const rootCommands = ["sudo su", "sudo -i"];

const helpLines = [
  { text: "Available commands:", color: "#f0a500" },
  { text: "  npm start   — launch the portfolio", color: "#888" },
  { text: "  sudo enter  — enter with root access", color: "#888" },
  { text: "  sudo launch — ignite thrusters", color: "#888" },
  { text: "", color: "#888" },
  { text: "Type a launch command to enter the site.", color: "#555" },
];

type HistoryEntry = { text: string; color: string };

export default function LoadingScreen() {
  const { setState: setLoadingState } = useLoading();
  const [visibleLines, setVisibleLines] = useState(0);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [logoHidden, setLogoHidden] = useState(false);
  const [input, setInput] = useState("");
  const [accepting, setAccepting] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [failCount, setFailCount] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const ghostCommand = "npm start";

  useEffect(() => {
    bootLines.forEach((line, i) => {
      setTimeout(() => setVisibleLines(i + 1), line.delay);
    });

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, 55);

    const readyTimer = setTimeout(() => setReady(true), 3100);

    document.body.style.overflow = "hidden";

    return () => {
      clearInterval(interval);
      clearTimeout(readyTimer);
    };
  }, []);

  // Auto-focus and scroll to bottom
  useEffect(() => {
    if (passwordMode && passwordRef.current) {
      passwordRef.current.focus();
    } else if (ready && inputRef.current) {
      inputRef.current.focus();
    }
  }, [ready, history, passwordMode]);

  // Show skip after 30s of inactivity on prompt
  useEffect(() => {
    if (!ready || showSkip) return;
    const timer = setTimeout(() => {
      setShowSkip(true);
      setHistory((prev) => [
        ...prev,
        { text: "", color: "#555" },
        { text: "Looks like you're stuck. No worries —", color: "#555" },
      ]);
    }, 30000);
    return () => clearTimeout(timer);
  }, [ready, showSkip]);

  // Scroll terminal to bottom when history changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history, ready]);

  const launch = useCallback(() => {
    // Hide logo from loading screen first
    setLogoHidden(true);
    // Trigger flying logo animation
    setLoadingState("logo-flying");
    // Fade out rest of loading screen
    setFadeOut(true);
    setTimeout(() => {
      document.body.style.overflow = "";
      setDone(true);
    }, 700);
  }, [setLoadingState]);

  const handlePasswordSubmit = async () => {
    const pwd = password;
    setPassword("");
    setHistory((prev) => [
      ...prev,
      { text: "[sudo] password for jc: ••••••••", color: "#888" },
    ]);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });

      if (!res.ok) {
        setHistory((prev) => [
          ...prev,
          { text: "sudo: Authentication failure.", color: "#ff5f57" },
        ]);
        setPasswordMode(false);
        return;
      }

      setAccepting(false);
      setPasswordMode(false);
      setHistory((prev) => [
        ...prev,
        { text: "✓ Root access granted. Entering system...", color: "#00f0d4" },
      ]);
      setTimeout(() => {
        window.location.href = "/0x72";
      }, 1000);
    } catch {
      setHistory((prev) => [
        ...prev,
        { text: "sudo: Authentication service unavailable.", color: "#ff5f57" },
      ]);
      setPasswordMode(false);
    }
  };

  const handleSubmit = () => {
    if (!accepting) return;

    const cmd = (input || ghostCommand).trim().toLowerCase();

    // Add the typed command to history
    setHistory((prev) => [
      ...prev,
      { text: `jc@portfolio:~$ ${input || ghostCommand}`, color: "#00f0d4" },
    ]);
    setInput("");

    // Check if it's a root command (needs password)
    if (rootCommands.includes(cmd)) {
      setPasswordMode(true);
      return;
    }

    // Check if it's a launch command
    const launchMatch = launchCommands[cmd];
    if (launchMatch) {
      setAccepting(false);
      launchMatch.forEach((text, i) => {
        setTimeout(() => {
          setHistory((prev) => [
            ...prev,
            {
              text,
              color: text.startsWith("✓") ? "#00f0d4" : "#f0a500",
            },
          ]);
        }, (i + 1) * 300);
      });
      setTimeout(launch, launchMatch.length * 300 + 600);
      return;
    }

    // Help command
    if (cmd === "help") {
      setHistory((prev) => [...prev, ...helpLines]);
      return;
    }

    // Easter eggs
    if (cmd === "clear") {
      setHistory([]);
      return;
    }

    if (cmd === "whoami") {
      setHistory((prev) => [
        ...prev,
        { text: "jacob_chodubski", color: "#00f0d4" },
      ]);
      return;
    }

    if (cmd === "ls") {
      setHistory((prev) => [
        ...prev,
        { text: "about.md  projects/  experience/  skills.json  contact.sh", color: "#888" },
      ]);
      return;
    }

    if (cmd === "pwd") {
      setHistory((prev) => [
        ...prev,
        { text: "/home/jacob/portfolio", color: "#888" },
      ]);
      return;
    }

    if (cmd === "neofetch") {
      setHistory((prev) => [
        ...prev,
        { text: "  JC   jacob@portfolio", color: "#00f0d4" },
        { text: "       OS: Portfolio OS v1.0", color: "#888" },
        { text: "       Stack: React / Next.js / Three.js", color: "#888" },
        { text: "       Theme: Terminal Noir", color: "#888" },
        { text: "       Coffee: ████████████ 100%", color: "#f0a500" },
      ]);
      return;
    }

    // Unknown command
    const newFails = failCount + 1;
    setFailCount(newFails);

    if (newFails >= 3 && !showSkip) {
      setShowSkip(true);
      setHistory((prev) => [
        ...prev,
        { text: `bash: ${cmd}: command not found`, color: "#ff5f57" },
        { text: "", color: "#555" },
        { text: "Having trouble? No worries —", color: "#555" },
      ]);
    } else {
      setHistory((prev) => [
        ...prev,
        { text: `bash: ${cmd}: command not found`, color: "#ff5f57" },
        { text: "Type 'help' for available commands.", color: "#555" },
      ]);
    }
  };

  if (done) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center transition-opacity duration-700 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "#020202" }}
    >
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,212,0.08) 2px, rgba(0,240,212,0.08) 4px)",
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,240,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,212,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-xl px-4 sm:px-8">
        {/* Logo */}
        <div className="flex justify-center mb-10" style={{ opacity: logoHidden ? 0 : 1 }}>
          <div className="relative">
            <div
              className="absolute inset-0 blur-[40px] opacity-30"
              style={{ background: "radial-gradient(circle, #00f0d4 0%, transparent 70%)" }}
            />
            <svg
              width="120"
              height="80"
              viewBox="0 0 120 80"
              fill="none"
              className="relative"
              style={{
                opacity: visibleLines > 0 ? 1 : 0,
                transition: "opacity 0.5s ease",
              }}
            >
              <path
                d="M20 10 L20 50 Q20 65 35 65 L42 65"
                stroke="#00f0d4"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{
                  strokeDasharray: 120,
                  strokeDashoffset: visibleLines > 2 ? 0 : 120,
                  transition: "stroke-dashoffset 1s ease",
                  filter: "drop-shadow(0 0 6px #00f0d4)",
                }}
              />
              <path
                d="M100 15 L75 15 Q60 15 60 30 L60 50 Q60 65 75 65 L100 65"
                stroke="#f0a500"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                style={{
                  strokeDasharray: 140,
                  strokeDashoffset: visibleLines > 2 ? 0 : 140,
                  transition: "stroke-dashoffset 1.2s ease 0.2s",
                  filter: "drop-shadow(0 0 6px #f0a500)",
                }}
              />
              <circle
                cx="50"
                cy="40"
                r="3"
                fill="#00f0d4"
                style={{
                  opacity: visibleLines > 5 ? 1 : 0,
                  transition: "opacity 0.3s ease",
                  filter: "drop-shadow(0 0 4px #00f0d4)",
                }}
              />
            </svg>
          </div>
        </div>

        {/* Terminal window */}
        <div
          className="border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden"
          style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
        >
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0f0f0f] border-b border-[#1a1a1a]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[10px] text-[#444] tracking-wider">
              jc@portfolio — bash
            </span>
          </div>

          {/* Terminal body — scrollable */}
          <div
            ref={terminalRef}
            className="p-3 sm:p-4 max-h-[280px] sm:max-h-[350px] overflow-y-auto cursor-text"
            onClick={() => inputRef.current?.focus()}
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "#1a1a1a #0a0a0a",
            }}
          >
            {/* Boot lines */}
            {bootLines.slice(0, visibleLines).map((line, i) => (
              <div
                key={`boot-${i}`}
                className="text-[11px] leading-[1.8] whitespace-pre"
                style={{
                  color: line.text.startsWith("$")
                    ? "#00f0d4"
                    : line.text.startsWith("  [+]")
                    ? "#888"
                    : line.text.startsWith("  →")
                    ? "#f0a500"
                    : line.text === "READY."
                    ? "#00f0d4"
                    : "#555",
                  textShadow:
                    line.text === "READY."
                      ? "0 0 10px rgba(0,240,212,0.5)"
                      : "none",
                  fontWeight: line.text === "READY." ? 700 : 400,
                }}
              >
                {line.text}
                {i === visibleLines - 1 && !ready && line.text !== "" && (
                  <span
                    className="inline-block w-[7px] h-[13px] ml-[2px] align-middle"
                    style={{
                      backgroundColor: "#00f0d4",
                      animation: "blink 1s step-end infinite",
                    }}
                  />
                )}
              </div>
            ))}

            {/* Command history */}
            {ready && (
              <div style={{ animation: "fadeIn 0.4s ease" }}>
                {/* Hint — only show if no history yet */}
                {history.length === 0 && (
                  <div className="text-[10px] leading-[1.8] text-[#333] mt-1 mb-0.5">
                    type a command and press Enter — try{" "}
                    <span className="text-[#444]">help</span> for options
                  </div>
                )}

                {/* Past commands & outputs */}
                {history.map((entry, i) => (
                  <div
                    key={`hist-${i}`}
                    className="text-[11px] leading-[1.8] whitespace-pre-wrap break-words"
                    style={{
                      color: entry.color,
                      textShadow: entry.text.startsWith("✓")
                        ? "0 0 8px rgba(0,240,212,0.4)"
                        : "none",
                      fontWeight: entry.text.startsWith("✓") ? 600 : 400,
                    }}
                  >
                    {entry.text}
                  </div>
                ))}

                {/* Password prompt */}
                {passwordMode && (
                  <div className="flex items-center text-[11px] leading-[1.8]">
                    <span className="text-[#f0a500] shrink-0">
                      [sudo] password for jc:&nbsp;
                    </span>
                    <input
                      ref={passwordRef}
                      type="password"
                      aria-label="Password input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handlePasswordSubmit();
                        if (e.key === "Escape") {
                          setPasswordMode(false);
                          setPassword("");
                        }
                      }}
                      spellCheck={false}
                      autoComplete="off"
                      className="w-full bg-transparent outline-none text-transparent caret-[#f0a500] text-[11px]"
                      style={{ fontFamily: "inherit" }}
                    />
                  </div>
                )}

                {/* Active prompt — only show if still accepting input */}
                {accepting && !passwordMode && (
                  <div className="flex items-center text-[11px] leading-[1.8]">
                    <span className="text-[#00f0d4] shrink-0">
                      jc@portfolio:~$&nbsp;
                    </span>
                    <div className="relative flex-1">
                      {/* Ghost suggestion */}
                      {!input && (
                        <span className="absolute inset-0 text-[#2a2a2a] pointer-events-none select-none">
                          {ghostCommand}
                        </span>
                      )}
                      <input
                        ref={inputRef}
                        type="text"
                        aria-label="Terminal command input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSubmit();
                          if (e.key === "Tab") {
                            e.preventDefault();
                            if (!input) setInput(ghostCommand);
                          }
                        }}
                        spellCheck={false}
                        autoComplete="off"
                        className="w-full bg-transparent outline-none text-[#e8e8e8] caret-[#00f0d4] text-[11px]"
                        style={{ fontFamily: "inherit" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-[3px] bg-[#111] overflow-hidden">
                <div
                  className="h-full transition-all duration-100 ease-linear"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #00f0d4, #f0a500)",
                    boxShadow: "0 0 8px rgba(0,240,212,0.4)",
                  }}
                />
              </div>
              <span
                className="text-[10px] tabular-nums tracking-wider"
                style={{ color: progress >= 100 ? "#00f0d4" : "#444" }}
              >
                {progress}%
              </span>
            </div>
          </div>
        </div>

        {/* Skip button */}
        {showSkip && (
          <div
            className="mt-6 flex justify-center"
            style={{ animation: "fadeInUp 0.5s ease forwards" }}
          >
            <button
              onClick={launch}
              className="group relative cursor-pointer"
            >
              <div
                className="relative px-6 py-2.5 border border-[#1a1a1a] text-[#555] text-[11px] tracking-[0.15em] overflow-hidden hover:border-[#00f0d4] hover:text-[#00f0d4] transition-all duration-300"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                sudo skip --force --no-nerd
              </div>
            </button>
          </div>
        )}

        {/* Bottom text */}
        <div
          className="mt-4 text-center text-[10px] tracking-[0.3em] uppercase"
          style={{
            color: "#333",
            opacity: ready ? 1 : 0,
            transition: "opacity 0.5s ease 0.3s",
          }}
        >
          Jacob Chodubski — Portfolio v1.0
        </div>
      </div>
    </div>
  );
}
