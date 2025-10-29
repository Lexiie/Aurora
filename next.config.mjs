/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true
  },
  eslint: {
    dirs: ["app", "components", "lib"]
  }
};

export default nextConfig;
