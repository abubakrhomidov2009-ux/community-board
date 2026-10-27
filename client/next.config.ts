import type { NextConfig } from 'next';

const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  // The repo has several lockfiles (monorepo), so tell Next.js where the client lives.
  turbopack: { root: __dirname },
  // The browser calls /api/... on this domain; Next.js forwards it to the backend.
  // This keeps the login cookie first-party (works on iPhone Safari too).
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiTarget}/api/:path*` }];
  },
  // Lets the phone open the dev server over the local Wi-Fi.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*'],
};

export default nextConfig;
