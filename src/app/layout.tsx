import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const SITE_URL = "https://jacobchodubski.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jacob Chodubski — Software Engineer",
    template: "%s | Jacob Chodubski",
  },
  description:
    "Portfolio of Jacob Chodubski — full-stack software engineer specializing in React, Next.js, TypeScript, and Node.js. 4+ years of experience building modern web applications.",
  keywords: [
    "Jacob Chodubski",
    "software engineer",
    "full-stack developer",
    "React developer",
    "Next.js developer",
    "TypeScript",
    "Node.js",
    "frontend developer",
    "web developer",
    "portfolio",
    "Poland",
  ],
  authors: [{ name: "Jacob Chodubski", url: SITE_URL }],
  creator: "Jacob Chodubski",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Jacob Chodubski",
    title: "Jacob Chodubski — Software Engineer",
    description:
      "Full-stack software engineer specializing in React, Next.js, TypeScript, and Node.js. 4+ years of experience building modern web applications.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jacob Chodubski — Software Engineer",
    description:
      "Full-stack software engineer specializing in React, Next.js, TypeScript, and Node.js.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "Jacob Chodubski",
              url: SITE_URL,
              jobTitle: "Software Engineer",
              knowsAbout: [
                "React",
                "Next.js",
                "TypeScript",
                "Node.js",
                "JavaScript",
                "Full-Stack Development",
                "Web Development",
                "Three.js",
              ],
              sameAs: [
                "https://github.com/KosaTV",
                "https://linkedin.com/in/jacob-chodubski",
              ],
            }),
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
