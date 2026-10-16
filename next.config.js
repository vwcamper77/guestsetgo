/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_RELEASE_ID: process.env.VERCEL_URL || "local" },
  async rewrites() {
    // Keep Firebase's sign-in helpers on our domain, including OAuth callbacks.
    const firebaseHost = `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "guestsetgo-123"}.firebaseapp.com`;
    return [
      { source: "/__/auth/:path*", destination: `https://${firebaseHost}/__/auth/:path*` },
      { source: "/__/firebase/init.json", destination: `https://${firebaseHost}/__/firebase/init.json` },
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "firebasestorage.googleapis.com" }],
  },
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};

module.exports = nextConfig;
