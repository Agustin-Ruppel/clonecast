import type { StorageAdapter } from './contracts';
import { localStorageAdapter } from './local';
import { r2StorageAdapter } from './r2';

let cached: StorageAdapter | null = null;
let cachedKey: string | null = null;

export function getStorage(): StorageAdapter {
  const choice = (process.env.CLONECAST_STORAGE || 'local').toLowerCase();
  if (cached && cachedKey === choice) return cached;
  cachedKey = choice;
  cached = choice === 'r2' ? r2StorageAdapter : localStorageAdapter;
  return cached;
}

export type { StorageAdapter } from './contracts';
