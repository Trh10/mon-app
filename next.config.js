/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Désactiver Edge Runtime pour le middleware pour éviter les conflits avec nodemailer
  experimental: {
    serverComponentsExternalPackages: ['nodemailer']
  }
};
module.exports = nextConfig;