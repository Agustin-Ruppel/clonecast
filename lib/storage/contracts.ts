export interface StorageAdapter {
  id: 'local' | 'r2';
  upload(localPath: string, options?: { keyPrefix?: string; contentType?: string }): Promise<string>;
  download(url: string, destPath: string): Promise<string>;
  signUrl?(url: string, ttlSec?: number): Promise<string>;
  delete(url: string): Promise<void>;
}
