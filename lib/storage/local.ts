import fs from 'fs-extra';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import type { StorageAdapter } from './contracts';

function urlToPath(url: string): string {
  if (url.startsWith('file://')) return fileURLToPath(url);
  return url;
}

export const localStorageAdapter: StorageAdapter = {
  id: 'local',
  async upload(localPath: string): Promise<string> {
    const abs = path.resolve(localPath);
    return pathToFileURL(abs).toString();
  },
  async download(url: string, destPath: string): Promise<string> {
    const src = urlToPath(url);
    if (path.resolve(src) !== path.resolve(destPath)) {
      await fs.ensureDir(path.dirname(destPath));
      await fs.copy(src, destPath, { overwrite: true });
    }
    return destPath;
  },
  async signUrl(url: string): Promise<string> {
    return url;
  },
  async delete(url: string): Promise<void> {
    const p = urlToPath(url);
    await fs.remove(p);
  },
};
