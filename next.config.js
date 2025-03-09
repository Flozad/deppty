/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'static1.sosiva451.com',
      // Add other domains if needed
    ],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig 