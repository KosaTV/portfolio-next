"use client";

import { useState, useEffect } from "react";
import { useLoading } from "./LoadingContext";

const navItems = [
  { label: "about", href: "#about" },
  { label: "skills", href: "#skills" },
  { label: "projects", href: "#projects" },
  { label: "experience", href: "#experience" },
  { label: "contact", href: "#contact" },
];

export default function Navigation() {
  const { state: loadingState } = useLoading();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const logoVisible = loadingState === "done";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#050505]/90 backdrop-blur-md border-b border-[var(--border)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex items-center justify-between">
        <a
          id="navbar-logo"
          href="#"
          aria-label="Jacob Chodubski — Home"
          className="flex items-center"
          style={{
            opacity: logoVisible ? 1 : 0,
            transition: "opacity 0.3s ease",
          }}
        >
          <svg
            width="48"
            height="32"
            viewBox="0 0 120 80"
            fill="none"
          >
            <path
              d="M20 10 L20 50 Q20 65 35 65 L42 65"
              stroke="var(--accent-cyan)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M100 15 L75 15 Q60 15 60 30 L60 50 Q60 65 75 65 L100 65"
              stroke="var(--accent-amber)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="50" cy="40" r="3.5" fill="var(--accent-cyan)" />
          </svg>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] text-xs uppercase tracking-[0.2em] transition-colors duration-300 link-underline"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <span className="text-[var(--text-muted)] mr-1">0{i + 1}.</span>
              {item.label}
            </a>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2"
          aria-label="Toggle menu"
        >
          <span
            className={`w-6 h-px bg-[var(--accent-cyan)] transition-all duration-300 ${
              mobileOpen ? "rotate-45 translate-y-[3.5px]" : ""
            }`}
          />
          <span
            className={`w-6 h-px bg-[var(--accent-cyan)] transition-all duration-300 ${
              mobileOpen ? "-rotate-45 -translate-y-[3.5px]" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#050505]/95 backdrop-blur-md border-b border-[var(--border)] animate-fade-in">
          <div className="flex flex-col px-6 py-6 gap-4">
            {navItems.map((item, i) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] text-sm uppercase tracking-[0.2em] transition-colors"
              >
                <span className="text-[var(--text-muted)] mr-2">0{i + 1}.</span>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
