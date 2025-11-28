
/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Ignora erros de tipagem no build (TypeScript)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignora erros e avisos do ESLint durante o build
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

