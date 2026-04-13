/** @type {import('next').NextConfig} */
const nextConfig = {
  // AWS SDK 번들링 최적화
  experimental: {
    serverComponentsExternalPackages: [
      '@aws-sdk/client-s3',
    ],
  },
};

module.exports = nextConfig;
