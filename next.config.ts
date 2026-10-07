import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // the dev badge sits exactly where the page counter is
  devIndicators: false,
  // lets tools/ measure a production build while `next dev` keeps running
  distDir: process.env.NEXT_DIST || ".next",
};

export default nextConfig;
