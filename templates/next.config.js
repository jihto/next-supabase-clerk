/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/ssr']
  },
  images: {
    domains: ['images.clerk.dev', 'img.clerk.com']
  }
}

module.exports = nextConfig
