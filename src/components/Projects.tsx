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

const projects = [
  {
    title: "CloudSync",
    subtitle: "Real-time collaboration platform",
    description:
      "A high-performance collaborative editing platform built for distributed teams. Features CRDT-based conflict resolution, real-time cursor presence, and sub-50ms latency across regions.",
    tech: ["TypeScript", "React", "WebSocket", "Redis", "PostgreSQL"],
    accent: "cyan",
    metrics: "10k+ DAU",
  },
  {
    title: "Vortex CLI",
    subtitle: "Developer workflow automation",
    description:
      "An extensible CLI toolkit that automates repetitive development workflows — from scaffolding to deployment. Plugin architecture supports custom transformers and hooks.",
    tech: ["Go", "gRPC", "Docker", "GitHub Actions"],
    accent: "amber",
    metrics: "2k+ GitHub stars",
  },
  {
    title: "NeuralFeed",
    subtitle: "AI-powered content aggregation",
    description:
      "Intelligent content aggregation engine using NLP to cluster, summarize, and rank articles from hundreds of sources. Custom ML pipeline processes 50k+ articles daily.",
    tech: ["Python", "FastAPI", "TensorFlow", "Elasticsearch", "Kafka"],
    accent: "cyan",
    metrics: "50k articles/day",
  },
  {
    title: "InfraGraph",
    subtitle: "Infrastructure visualization",
    description:
      "Interactive 3D visualization tool for cloud infrastructure. Maps AWS/GCP resources into navigable graph structures with real-time health monitoring and cost analysis.",
    tech: ["TypeScript", "Three.js", "Next.js", "AWS SDK", "D3.js"],
    accent: "amber",
    metrics: "Enterprise clients",
  },
];

export default function Projects() {
  const { ref, inView } = useInView();

  return (
    <section id="projects" className="relative py-32 md:py-40" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className={`mb-16 ${inView ? "animate-fade-in-up" : "opacity-0"}`}>
          <span className="text-xs text-[var(--accent-amber)] uppercase tracking-[0.3em] block mb-4">
            03 — Work
          </span>
          <h2
            className="text-4xl md:text-5xl font-black tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Featured{" "}
            <span className="text-[var(--accent-cyan)] glow-cyan italic">Projects</span>
          </h2>
        </div>

        <div className="space-y-6 md:space-y-8">
          {projects.map((project, i) => (
            <div
              key={project.title}
              className={`group relative ${inView ? "animate-fade-in-up" : "opacity-0"}`}
              style={{ animationDelay: `${(i + 1) * 0.15}s` }}
            >
              <div
                className={`relative p-8 md:p-10 bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all duration-500 hover-lift ${
                  project.accent === "cyan" ? "glow-box" : "glow-box-amber"
                } hover:bg-[var(--bg-card-hover)]`}
                style={{
                  boxShadow: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    project.accent === "cyan"
                      ? "0 0 40px var(--accent-cyan-dim)"
                      : "0 0 40px var(--accent-amber-dim)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="flex-1">
                    {/* Project number */}
                    <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.3em] block mb-3">
                      project_{String(i + 1).padStart(2, "0")}
                    </span>

                    {/* Title row */}
                    <div className="flex items-baseline gap-3 mb-2">
                      <h3
                        className={`text-2xl md:text-3xl font-bold tracking-tight ${
                          project.accent === "cyan"
                            ? "text-[var(--accent-cyan)]"
                            : "text-[var(--accent-amber)]"
                        }`}
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {project.title}
                      </h3>
                      <span className="text-xs text-[var(--text-muted)]">
                        — {project.subtitle}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl mt-3">
                      {project.description}
                    </p>

                    {/* Tech tags */}
                    <div className="flex flex-wrap gap-2 mt-5">
                      {project.tech.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] px-2.5 py-1 border border-[var(--border)] text-[var(--text-muted)] tracking-wider"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Metrics badge */}
                  <div className="shrink-0 flex items-center gap-2 self-start">
                    <div
                      className={`status-dot ${
                        project.accent === "amber"
                          ? "!bg-[var(--accent-amber)]"
                          : ""
                      }`}
                      style={
                        project.accent === "amber"
                          ? { boxShadow: "0 0 8px var(--accent-amber)" }
                          : {}
                      }
                    />
                    <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                      {project.metrics}
                    </span>
                  </div>
                </div>

                {/* Corner decorations */}
                <div
                  className={`absolute top-0 right-0 w-8 h-8 border-t border-r opacity-20 transition-opacity group-hover:opacity-60 ${
                    project.accent === "cyan"
                      ? "border-[var(--accent-cyan)]"
                      : "border-[var(--accent-amber)]"
                  }`}
                />
                <div
                  className={`absolute bottom-0 left-0 w-8 h-8 border-b border-l opacity-20 transition-opacity group-hover:opacity-60 ${
                    project.accent === "cyan"
                      ? "border-[var(--accent-cyan)]"
                      : "border-[var(--accent-amber)]"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
