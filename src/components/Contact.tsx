"use client";

import { useEffect, useRef, useState } from "react";
import ContactModal from "./ContactModal";

function useInView(threshold = 0.15) {
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

const links = [
  { label: "GitHub", href: "https://github.com/kosatv", icon: "gh" },
  { label: "LinkedIn", href: "https://linkedin.com/in/jacob-chodubski", icon: "in" },
  { label: "Medium", href: "https://medium.com/@jacobchodubski", icon: "M" },
  { label: "Email", href: "mailto:ch.jakub23@gmail.com", icon: "@" },
];

export default function Contact() {
  const { ref, inView } = useInView();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section id="contact" className="relative py-32 md:py-40" ref={ref}>
      {/* Ambient blobs */}
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[var(--accent-cyan)] rounded-full opacity-[0.03] blur-[150px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[var(--accent-amber)] rounded-full opacity-[0.03] blur-[150px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 text-center">
        <div className={`${inView ? "animate-fade-in-up" : "opacity-0"}`}>
          <span className="text-xs text-[var(--accent-amber)] uppercase tracking-[0.3em] block mb-4">
            05 — Contact
          </span>
          <h2
            className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Let&apos;s build
            <br />
            <span className="text-[var(--accent-cyan)] glow-cyan italic">something great</span>
          </h2>
        </div>

        <p
          className={`mt-6 text-sm md:text-base text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed ${
            inView ? "animate-fade-in-up delay-200" : "opacity-0"
          }`}
        >
          I&apos;m always open to discussing new projects, creative ideas, or opportunities
          to be part of something meaningful. Drop me a line.
        </p>

        {/* CTA */}
        <div className={`mt-10 ${inView ? "animate-fade-in-up delay-400" : "opacity-0"}`}>
          <button
            onClick={() => setModalOpen(true)}
            className="group inline-flex items-center gap-3 px-8 py-4 text-sm font-semibold text-[var(--bg-primary)] bg-[var(--accent-cyan)] hover:bg-[var(--accent-amber)] transition-colors duration-300 cursor-pointer"
          >
            say_hello()
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>

        {/* Social links */}
        <div
          className={`mt-12 flex items-center justify-center gap-6 ${
            inView ? "animate-fade-in-up delay-600" : "opacity-0"
          }`}
        >
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2"
            >
              <span className="w-12 h-12 flex items-center justify-center border border-[var(--border)] text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] group-hover:border-[var(--accent-cyan-dim)] transition-all duration-300 text-xs font-bold">
                {link.icon}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest group-hover:text-[var(--text-secondary)] transition-colors">
                {link.label}
              </span>
            </a>
          ))}
        </div>
      </div>

      <ContactModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
