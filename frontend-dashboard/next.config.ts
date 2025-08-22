import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_PLANNER_AGENT_URL: process.env.PLANNER_AGENT_URL,
    NEXT_PUBLIC_PLANNER_BACKEND_URL: process.env.PLANNER_BACKEND_URL,
    NEXT_PUBLIC_BROWSER_USE_API_URL: process.env.BROWSER_USE_API_URL,
    NEXT_PUBLIC_N8N_URL: process.env.N8N_URL,
  },
};

export default nextConfig;
