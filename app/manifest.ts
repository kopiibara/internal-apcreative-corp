import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AP Creative Dashboard",
    short_name: "AP Creative",
    description:
      "Internal AP Creative dashboard for approvals, tasks, reports, and staff accountability.",
    start_url: "/login",
    display: "standalone",
    background_color: "#f8f3e8",
    theme_color: "#1d2d89",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
