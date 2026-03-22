import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JC OS",
    short_name: "JC OS",
    description: "Jacob Chodubski's OS Simulator",
    start_url: "/",
    display: "fullscreen",
    background_color: "#050505",
    theme_color: "#00f0d4",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
