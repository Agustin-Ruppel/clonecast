/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '50mb' } },
  // @hyperframes/producer is Node-only (puppeteer + ffmpeg subprocesses) and is
  // only loaded via dynamic import inside the renderVideo() path — externalize.
  // @hyperframes/core ships ESM with extensionless internal imports; Node ESM
  // can't resolve those, so we let webpack bundle it (don't externalize).
  serverExternalPackages: ['fs-extra', '@hyperframes/producer', '@hyperframes/engine'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // hyperframesRuntime.engine pulls in esbuild's buildSync — only used by the
      // package's runtime artifact builder, which we never invoke at runtime.
      // Stub it out so webpack doesn't try to bundle esbuild's native loader.
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        esbuild: false,
      };
    }
    return config;
  },
};
export default nextConfig;
