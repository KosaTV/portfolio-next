"use client";

import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.1) {
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

const experiences = [
  {
    role: "Full Stack Developer",
    company: "Digalyze",
    period: "May 2024 — Present",
    description:
      "Building a global AI compliance platform for financial institutions. Developed cross-platform NFC-enabled apps, B2B payment software, and led a team on a car-rental platform. Improved load times by 32% and boosted SEO from page 3 to page 1.",
    highlights: ["React", "NestJS", "AWS", "PostgreSQL", "Team Lead"],
  },
  {
    role: "Mid TypeScript Developer",
    company: "Data Lake",
    period: "Feb 2024 — May 2024",
    description:
      "Contributed to a TypeScript-based healthcare platform serving hospitals and patients. Designed and implemented API, database, and component-level tests, increasing system stability and reducing production regressions.",
    highlights: ["Next.js", "Express", "PostgreSQL", "Jest"],
  },
  {
    role: "Junior Full Stack Developer",
    company: "R-Solutions",
    period: "Dec 2022 — Dec 2023",
    description:
      "Designed and published a mobile app on App Store and Google Play end-to-end. Built and maintained 15+ frontend and backend applications including a full-scale eCommerce platform.",
    highlights: ["React Native", "Next.js", "Astro", "Vue", "NestJS"],
  },
  {
    role: "Junior Web Developer",
    company: "ROL-BART",
    period: "Nov 2021 — Oct 2022",
    description:
      "Designed, developed and maintained web applications. Managed and configured databases to ensure optimal performance and data integrity.",
    highlights: ["Web Development", "Databases"],
  },
];

export default function Experience() {
  const { ref, inView } = useInView();

  return (
    <section id="experience" className="relative py-20 sm:py-32 md:py-40 grid-bg" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12">
        <div className={`mb-16 ${inView ? "animate-fade-in-up" : "opacity-0"}`}>
          <span className="text-xs text-[var(--accent-amber)] uppercase tracking-[0.3em] block mb-4">
            04 — Career
          </span>
          <h2
            className="text-4xl md:text-5xl font-black tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Work{" "}
            <span className="text-[var(--accent-cyan)] glow-cyan italic">Experience</span>
          </h2>
        </div>

        <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-0 md:left-8 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--accent-cyan)] via-[var(--border)] to-transparent" />

            <div className="space-y-12">
              {experiences.map((exp, i) => (
                <div
                  key={exp.company}
                  className={`relative pl-8 md:pl-20 ${
                    inView ? "animate-fade-in-up" : "opacity-0"
                  }`}
                  style={{ animationDelay: `${(i + 1) * 0.2}s` }}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 md:left-8 top-2 -translate-x-1/2">
                    <div className="w-3 h-3 bg-[var(--bg-primary)] border-2 border-[var(--accent-cyan)] rotate-45" />
                  </div>

                  {/* Period */}
                  <span className="text-[11px] text-[var(--accent-cyan)] uppercase tracking-[0.2em] block mb-2">
                    {exp.period}
                  </span>

                  {/* Role and Company */}
                  <h3
                    className="text-xl md:text-2xl font-bold text-[var(--text-primary)] tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {exp.role}
                  </h3>
                  <span className="text-sm text-[var(--accent-amber)] font-medium block mt-1">
                    @ {exp.company}
                  </span>

                  {/* Description */}
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-3 max-w-2xl">
                    {exp.description}
                  </p>

                  {/* Highlight tags */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {exp.highlights.map((h) => (
                      <span
                        key={h}
                        className="text-[10px] px-2.5 py-1 border border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
    </section>
  );
}
