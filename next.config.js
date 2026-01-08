/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Mettre à true temporairement si besoin
  },
  eslint: {
    ignoreDuringBuilds: false, // Mettre à true temporairement si besoin
  },
  experimental: {
    // Consolidated external packages (merged nodemailer + firebase-admin)
    serverComponentsExternalPackages: ['firebase-admin', 'nodemailer'],
  },
  // Configuration pour le déploiement
  output: 'standalone',
  // Optimisations
  swcMinify: true,
  compress: true,
};

module.exports = nextConfig;
