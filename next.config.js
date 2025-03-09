/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      'static1.sosiva451.com',
      'daxdyzuwcdofftlxmpss.supabase.co'
    ],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig 