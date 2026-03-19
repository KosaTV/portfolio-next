import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Jacob Chodubski — Software Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* Grid bg */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0,240,212,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,240,212,0.04) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Logo */}
        <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
          <path
            d="M20 10 L20 50 Q20 65 35 65 L42 65"
            stroke="#00f0d4"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M100 15 L75 15 Q60 15 60 30 L60 50 Q60 65 75 65 L100 65"
            stroke="#f0a500"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="50" cy="40" r="3.5" fill="#00f0d4" />
        </svg>

        {/* Name */}
        <div
          style={{
            marginTop: 32,
            fontSize: 48,
            fontWeight: 700,
            color: "#e8e8e8",
            letterSpacing: "-0.02em",
          }}
        >
          Jacob Chodubski
        </div>

        {/* Title */}
        <div
          style={{
            marginTop: 12,
            fontSize: 22,
            color: "#00f0d4",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Software Engineer
        </div>

        {/* Tech stack */}
        <div
          style={{
            marginTop: 24,
            fontSize: 16,
            color: "#555",
            display: "flex",
            gap: 16,
          }}
        >
          <span>React</span>
          <span style={{ color: "#333" }}>·</span>
          <span>Next.js</span>
          <span style={{ color: "#333" }}>·</span>
          <span>TypeScript</span>
          <span style={{ color: "#333" }}>·</span>
          <span>Node.js</span>
        </div>

        {/* Bottom line */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 14,
            color: "#333",
            letterSpacing: "0.2em",
          }}
        >
          jacobchodubski.dev
        </div>
      </div>
    ),
    { ...size }
  );
}
