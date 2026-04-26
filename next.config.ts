import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Fix: prevent Next.js detecting the wrong workspace root when there
    // is a package-lock.json higher up in the directory tree
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
