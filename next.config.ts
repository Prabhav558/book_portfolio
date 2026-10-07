import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the dev badge sits exactly where the page counter is
  devIndicators: false,
  // lets tools/ measure a production build while `next dev` keeps running
  distDir: process.env.NEXT_DIST || ".next",
  // static export for GitHub Pages
  output: process.env.NEXT_EXPORT ? "export" : undefined,
  // GitHub Pages serves under /<repo-name>/ — set NEXT_BASE_PATH to match
  basePath: process.env.NEXT_BASE_PATH || "",
  // the same prefix for the browser's own code (lib/asset.ts), which needs it for plain links and images
  env: { NEXT_PUBLIC_BASE_PATH: process.env.NEXT_BASE_PATH || "" },
  // required for <Image> in static export
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
