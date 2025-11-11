/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/:path*` : 'https://ragchat12481-backend.gentlecoast-36ec39ac.westeurope.azurecontainerapps.io/:path*',
      },
    ]
  },
}

module.exports = nextConfig