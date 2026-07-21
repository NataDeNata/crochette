import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the dev server's HMR/dev resources load when testing through an ngrok
  // tunnel (needed for local Xendit webhook testing, which requires HTTPS).
  // Dev-only — has no effect on production builds.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
