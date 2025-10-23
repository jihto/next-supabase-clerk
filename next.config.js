/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['images.clerk.dev', 'img.clerk.com'],
  },
}

module.exports = nextConfig
