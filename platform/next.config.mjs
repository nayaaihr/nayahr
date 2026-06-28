/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep pg server-only (avoid bundling its dynamic requires). Next 14.2 key.
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
};
export default nextConfig;
