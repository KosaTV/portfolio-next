import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jacob Chodubski — Software Engineer",
  description: "Portfolio of Jacob Chodubski, a software engineer crafting elegant solutions to complex problems.",
  keywords: ["software engineer", "developer", "portfolio", "Jacob Chodubski"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
