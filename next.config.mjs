/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '50mb' } },
  serverExternalPackages: ['fs-extra'],
};
export default nextConfig;
