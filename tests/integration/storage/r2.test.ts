import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { r2StorageAdapter } from '@/lib/storage/r2';

beforeEach(() => { process.env.CLONECAST_MOCK = 'true'; });

describe('r2StorageAdapter (mock mode)', () => {
  it('upload returns r2://mock-bucket/<keyPrefix>/<basename> without network', async () => {
    const tmp = path.join(os.tmpdir(), `cc-r2-${Date.now()}.mp4`);
    await fs.writeFile(tmp, 'fake');
    const url = await r2StorageAdapter.upload(tmp, { keyPrefix: 'outputs' });
    expect(url).toBe(`r2://mock-bucket/outputs/${path.basename(tmp)}`);
    await fs.remove(tmp);
  });

  it('download in mock mode writes empty file at destPath and returns it', async () => {
    const dest = path.join(os.tmpdir(), `cc-r2-dl-${Date.now()}.mp4`);
    const out = await r2StorageAdapter.download('r2://mock-bucket/outputs/x.mp4', dest);
    expect(out).toBe(dest);
    expect(await fs.pathExists(dest)).toBe(true);
    await fs.remove(dest);
  });

  it('signUrl in mock mode returns input url unchanged', async () => {
    const u = 'r2://mock-bucket/outputs/y.mp4';
    const s = await r2StorageAdapter.signUrl!(u);
    expect(s).toBe(u);
  });

  it('delete in mock mode is a no-op (does not throw)', async () => {
    await expect(r2StorageAdapter.delete('r2://mock-bucket/outputs/z.mp4')).resolves.toBeUndefined();
  });

  it('id is "r2"', () => {
    expect(r2StorageAdapter.id).toBe('r2');
  });

  it.skipIf(process.env.RUN_REAL_R2 !== 'true')('uploads to a real R2 bucket', async () => {
    process.env.CLONECAST_MOCK = 'false';
    const tmp = path.join(os.tmpdir(), `cc-r2-real-${Date.now()}.txt`);
    await fs.writeFile(tmp, 'real');
    const url = await r2StorageAdapter.upload(tmp, { keyPrefix: 'tests' });
    expect(url).toMatch(/^(https?:\/\/|r2:\/\/)/);
    await r2StorageAdapter.delete(url);
    await fs.remove(tmp);
  });
});
