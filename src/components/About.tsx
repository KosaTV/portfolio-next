"use client";

import { useEffect, useRef, useState } from "react";
import ParallaxImage from "./ParallaxImage";

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export default function About() {
  const { ref, inView } = useInView();

  return (
    <section id="about" className="relative py-32 md:py-40 overflow-hidden" ref={ref}>
      <ParallaxImage />
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-12 gap-12 md:gap-16 items-start">
          {/* Left column — heading */}
          <div className="md:col-span-4">
            <div className={`${inView ? "animate-slide-in-left" : "opacity-0"}`}>
              <span className="text-xs text-[var(--accent-amber)] uppercase tracking-[0.3em] block mb-4">
                01 — About
              </span>
              <h2
                className="text-4xl md:text-5xl font-black tracking-tight leading-[1.1]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Who I<br />
                <span className="text-[var(--accent-cyan)] glow-cyan italic">am</span>
              </h2>
            </div>

            {/* Stats */}
            <div className={`mt-10 space-y-4 ${inView ? "animate-fade-in-up delay-400" : "opacity-0"}`}>
              {[
                { value: "4+", label: "Years of Experience" },
                { value: "15+", label: "Apps Delivered" },
                { value: "∞", label: "Lines of Coffee" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-[var(--accent-cyan)]">{stat.value}</span>
                  <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — content */}
          <div className="md:col-span-8">
            <div className={`${inView ? "animate-fade-in-up delay-200" : "opacity-0"}`}>
              <div className="relative p-8 md:p-10 bg-[var(--bg-card)] border border-[var(--border)] gradient-border">
                {/* Terminal bar */}
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--border)]">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                  <span className="ml-4 text-xs text-[var(--text-muted)]">about.md</span>
                </div>

                <div className="space-y-4 text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
                  <p>
                    <span className="text-[var(--accent-cyan)]">## </span>
                    I&apos;m a software engineer based in Poland who thrives at the intersection
                    of <span className="text-[var(--text-primary)] font-medium">elegant code</span> and{" "}
                    <span className="text-[var(--text-primary)] font-medium">real-world impact</span>.
                  </p>
                  <p>
                    My journey began with curiosity about how things work under the hood — from
                    pixel-perfect frontends to scalable backend architectures. Today, I build full-stack
                    applications that ship globally, from AI compliance platforms to mobile apps
                    on the App Store — writing code that&apos;s as readable as it is performant.
                  </p>
                  <p>
                    When I&apos;m not shipping features, you&apos;ll find me writing on
                    Medium, optimizing web performance, or deep-diving
                    into the latest in cloud-native tooling. I believe great software is built
                    with <span className="text-[var(--accent-amber)]">empathy</span>,{" "}
                    <span className="text-[var(--accent-amber)]">precision</span>, and a healthy
                    dose of <span className="text-[var(--accent-amber)]">pragmatism</span>.
                  </p>
                </div>

                {/* Decorative corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[var(--accent-cyan)] opacity-40" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[var(--accent-cyan)] opacity-40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
