/** @type {import('next').NextConfig} */
const nextConfig = {
  // Node.js polyfills needed by simple-peer in browser bundles
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        crypto: false,
        os: false,
        path: false,
        stream: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;