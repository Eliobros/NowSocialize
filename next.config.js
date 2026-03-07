/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  experimental: {
    turbo: {
      resolveAlias: {
        net: false,
        tls: false,
        fs: false,
      }
    }
  }
}

module.exports = nextConfig
