/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["lucide-react"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "multion-client-screenshots.s3.us-east-2.amazonaws.com",
      },
    ],
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
