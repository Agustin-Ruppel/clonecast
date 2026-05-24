import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  ssr: {
    // @hyperframes/core ships ESM with extensionless internal imports — Node ESM
    // can't resolve them, but Vite's bundler-style resolver can. Force Vite to
    // process the package instead of letting it run through native Node.
    noExternal: ['@hyperframes/core', '@hyperframes/producer'],
  },
});
