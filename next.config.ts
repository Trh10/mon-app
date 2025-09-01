import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Mettre à true temporairement si besoin
  },
  eslint: {
    ignoreDuringBuilds: false, // Mettre à true temporairement si besoin
  },
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
  // Configuration pour le déploiement
  output: 'standalone',
  // Optimisations
  swcMinify: true,
  compress: true,
};

export default nextConfig;
