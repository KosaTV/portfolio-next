"use client";

import { useEffect, useRef, useState } from "react";

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

const categories = [
  {
    title: "Languages",
    icon: "{ }",
    items: ["TypeScript", "JavaScript", "HTML5", "CSS3 / SCSS", "SQL"],
  },
  {
    title: "Frontend",
    icon: "</>",
    items: ["React", "Next.js", "React Native", "Vue.js", "Astro", "Redux", "Figma"],
  },
  {
    title: "Backend",
    icon: ">>>",
    items: ["Node.js", "Express", "NestJS", "REST", "GraphQL", "PostgreSQL", "MongoDB"],
  },
  {
    title: "CMS & eCommerce",
    icon: "[ ]",
    items: ["WordPress", "Strapi", "Shopify"],
  },
  {
    title: "DevOps & Cloud",
    icon: "~/$",
    items: ["AWS", "Docker", "CI/CD", "Webpack", "Postman"],
  },
  {
    title: "Tools & Practices",
    icon: ":::",
    items: ["Git & GitHub", "VS Code", "A/B Testing", "Unit Testing", "Jest", "Clerk"],
  },
];

export default function Skills() {
  const { ref, inView } = useInView();

  return (
    <section id="skills" className="relative py-32 md:py-40 grid-bg" ref={ref}>
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent-cyan)] rounded-full opacity-[0.02] blur-[150px]" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12">
        <div className={`mb-16 ${inView ? "animate-fade-in-up" : "opacity-0"}`}>
          <span className="text-xs text-[var(--accent-amber)] uppercase tracking-[0.3em] block mb-4">
            02 — Tech Stack
          </span>
          <h2
            className="text-4xl md:text-5xl font-black tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Skills &{" "}
            <span className="text-[var(--accent-cyan)] glow-cyan italic">Technologies</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {categories.map((cat, i) => (
            <div
              key={cat.title}
              className={`group relative p-6 md:p-8 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-hover)] hover-lift ${
                inView ? "animate-fade-in-up" : "opacity-0"
              }`}
              style={{ animationDelay: `${(i + 1) * 0.1}s` }}
            >
              {/* Category icon */}
              <div className="flex items-center justify-between mb-5">
                <span className="text-xl font-bold text-[var(--accent-cyan)] opacity-60 group-hover:opacity-100 transition-opacity">
                  {cat.icon}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">
                {cat.title}
              </h3>

              <div className="flex flex-wrap gap-2">
                {cat.items.map((item) => (
                  <span
                    key={item}
                    className="text-xs px-3 py-1.5 bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan-dim)] transition-colors cursor-default"
                  >
                    {item}
                  </span>
                ))}
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-cyan-dim)] to-transparent opacity-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
