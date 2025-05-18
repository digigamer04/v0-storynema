// Configuración mínima para Next.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración básica
  reactStrictMode: true,

  // Configuración de imágenes simplificada
  images: {
    domains: ["localhost"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
    ],
    unoptimized: true,
  },

  // Asegurarnos de que los alias estén correctamente configurados
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": require("path").resolve(__dirname, "./"),
    }
    return config
  },

  // Ignorar errores de ESLint durante la construcción
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignorar errores de TypeScript durante la construcción
  typescript: {
    ignoreBuildErrors: true,
  },
}

// Verificación para asegurarnos de que no hay problemas con la exportación
console.log("Cargando configuración de Next.js desde next.config.js")

module.exports = nextConfig
