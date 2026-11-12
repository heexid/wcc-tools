import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev badge would sit inside every G3 screenshot (bottom-left of the 1440 frame).
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
