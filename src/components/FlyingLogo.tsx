"use client";

import { useEffect, useState } from "react";
import { useLoading } from "./LoadingContext";

export default function FlyingLogo() {
  const { state, setState } = useLoading();
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state !== "logo-flying") return;

    // Start: centered on screen (where loading screen logo was)
    setStyle({
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -180px) scale(2.5)",
      opacity: 1,
      transition: "none",
      zIndex: 99998,
    });
    setVisible(true);

    // Next frame: animate to navbar position
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setStyle({
          position: "fixed",
          top: "14px",
          left: "24px",
          transform: "translate(0, 0) scale(1)",
          opacity: 1,
          transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 99998,
        });
      });
    });

    // After animation: hide flying logo, show navbar logo
    const timer = setTimeout(() => {
      setVisible(false);
      setState("done");
    }, 900);

    return () => clearTimeout(timer);
  }, [state, setState]);

  if (!visible) return null;

  return (
    <div style={style} className="pointer-events-none">
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
          style={{ filter: "drop-shadow(0 0 6px var(--accent-cyan))" }}
        />
        <path
          d="M100 15 L75 15 Q60 15 60 30 L60 50 Q60 65 75 65 L100 65"
          stroke="var(--accent-amber)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{ filter: "drop-shadow(0 0 6px var(--accent-amber))" }}
        />
        <circle
          cx="50"
          cy="40"
          r="3.5"
          fill="var(--accent-cyan)"
          style={{ filter: "drop-shadow(0 0 4px var(--accent-cyan))" }}
        />
      </svg>
    </div>
  );
}
