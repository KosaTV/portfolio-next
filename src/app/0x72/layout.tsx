import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JC OS",
  robots: { index: false, follow: false },
};

export default function SysLayout({ children }: { children: React.ReactNode }) {
  return children;
}
