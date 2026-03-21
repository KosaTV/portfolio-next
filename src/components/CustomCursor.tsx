"use client";

import { useEffect, useRef } from "react";

const INTERACTIVE = "a, button, [role='button'], input, textarea, select, [data-cursor-hover]";

interface CustomCursorProps {
  color?: string;
  ringSize?: number;
  blur?: number;
}

export default function CustomCursor({ color = "#00f0d4", ringSize = 28, blur = 1 }: CustomCursorProps) {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const hovering = useRef(false);
  const raf = useRef<number>(0);

  useEffect(() => {
    if ("ontouchstart" in window) return;

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        dotRef.current.style.visibility = "visible";
      }
      if (ringRef.current) ringRef.current.style.visibility = "visible";
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const related = e.relatedTarget as HTMLElement | null;
      if (target.closest(INTERACTIVE) && !related?.closest(INTERACTIVE)) {
        hovering.current = true;
      }
    };

    const onOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      if (
        (e.target as HTMLElement).closest(INTERACTIVE) &&
        !related?.closest(INTERACTIVE)
      ) {
        hovering.current = false;
      }
    };

    const onLeave = () => {
      if (dotRef.current) dotRef.current.style.visibility = "hidden";
      if (ringRef.current) ringRef.current.style.visibility = "hidden";
    };

    const animate = () => {
      ringPos.current.x += (mouse.current.x - ringPos.current.x) * 0.35;
      ringPos.current.y += (mouse.current.y - ringPos.current.y) * 0.35;

      if (ringRef.current) {
        const scale = hovering.current ? 1.6 : 1;
        ringRef.current.style.transform = `translate(${ringPos.current.x}px, ${ringPos.current.y}px) translate(-50%, -50%) scale(${scale})`;
        ringRef.current.style.opacity = hovering.current ? "0.5" : "1";
      }

      raf.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);
    document.addEventListener("mouseleave", onLeave);
    raf.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        style={{
          position: "fixed", top: 0, left: 0,
          width: 4, height: 4, borderRadius: "50%",
          backgroundColor: color,
          pointerEvents: "none", zIndex: 100000,
          visibility: "hidden",
          transform: "translate(-100px, -100px) translate(-50%, -50%)",
        }}
      />
      <div
        ref={ringRef}
        style={{
          position: "fixed", top: 0, left: 0,
          width: ringSize, height: ringSize, borderRadius: "50%",
          border: `1.5px solid ${color}`,
          boxShadow: `0 0 14px ${color}55`,
          backdropFilter: `blur(${blur}px)`,
          pointerEvents: "none", zIndex: 100000,
          transition: "opacity 0.2s ease",
          visibility: "hidden",
          transform: "translate(-100px, -100px) translate(-50%, -50%)",
        }}
      />
    </>
  );
}
