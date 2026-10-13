import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Adnan Bin Farook — Portfolio",
    short_name: "Adnan ABF",
    description:
      "Senior Software Engineer Portfolio — .NET, Next.js, Cloud Architectures",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0f1d",
    theme_color: "#00b894",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
