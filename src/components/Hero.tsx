"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const HeroBackground = dynamic(() => import("./HeroBackground"), {
  ssr: false,
});

export default function Hero() {
  const [typed, setTyped] = useState("");
  const fullText = "software engineer";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setTyped(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden grid-bg scanline">
      {/* 3D Background */}
      <HeroBackground />

      {/* Ambient light blobs */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 md:w-96 md:h-96 bg-[var(--accent-cyan)] rounded-full opacity-[0.04] blur-[120px] animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 md:w-96 md:h-96 bg-[var(--accent-amber)] rounded-full opacity-[0.04] blur-[120px] animate-float delay-300" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 md:px-12">
        {/* Terminal line */}
        <div className="animate-fade-in-up text-xs text-[var(--text-muted)] mb-6 tracking-widest uppercase">
          <span className="text-[var(--accent-cyan)]">~</span> / portfolio
        </div>

        {/* Name */}
        <h1
          className="animate-fade-in-up delay-200 text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black tracking-[-0.04em] leading-[0.85]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="block text-[var(--text-primary)]">Jacob</span>
          <span className="block text-[var(--accent-cyan)] glow-cyan mt-1">
            Chodubski
          </span>
        </h1>

        {/* Typed subtitle */}
        <h2 className="sr-only">Software Engineer</h2>
        <div className="animate-fade-in-up delay-500 mt-8 flex items-center gap-3" aria-hidden="true">
          <span className="text-[var(--accent-amber)] text-sm">{">"}</span>
          <span className="text-lg md:text-xl text-[var(--text-secondary)] tracking-wide">
            {typed}
            <span className="inline-block w-2.5 h-5 bg-[var(--accent-cyan)] ml-0.5 animate-[blink_1s_step-end_infinite] align-middle" />
          </span>
        </div>

        {/* Brief intro */}
        <p className="animate-fade-in-up delay-700 mt-6 text-sm md:text-base text-[var(--text-muted)] max-w-xl leading-relaxed">
          Building performant, scalable systems and crafting interfaces that feel
          alive. Passionate about clean architecture, open source, and pushing
          the boundaries of what&apos;s possible on the web.
        </p>

        {/* CTA row */}
        <div className="animate-fade-in-up delay-900 mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#projects"
            className="group relative inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[var(--bg-primary)] bg-[var(--accent-cyan)] rounded-none hover:bg-[var(--accent-amber)] transition-colors duration-300"
          >
            view_projects()
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-[var(--accent-cyan)] border border-[var(--accent-cyan)] rounded-none hover:bg-[var(--accent-cyan-dim)] transition-colors duration-300"
          >
            get_in_touch()
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="animate-fade-in delay-1200 absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.3em]">
            scroll
          </span>
          <div className="w-px h-12 bg-gradient-to-b from-[var(--accent-cyan)] to-transparent" />
        </div>
      </div>
    </section>
  );
}
