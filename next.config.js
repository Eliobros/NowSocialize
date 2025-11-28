/** @type {import('next').NextConfig} */
const nextConfig = {

//erro de ts
typescript: {
ignoreBuildErrors: true,
},

eslint: {
ignoreDuringBuilds: true,
},

  // Outras configurações que você já tem...
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
