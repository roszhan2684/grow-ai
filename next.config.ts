import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/demo", destination: "/#overview", permanent: true },
      { source: "/architecture", destination: "/product", permanent: true },
      { source: "/benchmarks", destination: "/product", permanent: true },
      { source: "/build-log", destination: "/", permanent: true },
      { source: "/changelog", destination: "/", permanent: true },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
