import { describe, it, expect } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { localStorageAdapter } from '@/lib/storage/local';

describe('LocalStorageAdapter', () => {
  it('upload returns file:// URL for the local path', async () => {
    const tmp = path.join(os.tmpdir(), `cc-local-${Date.now()}.txt`);
    await fs.writeFile(tmp, 'hello');
    const url = await localStorageAdapter.upload(tmp);
    expect(url).toBe(pathToFileURL(path.resolve(tmp)).toString());
    await fs.remove(tmp);
  });

  it('download is a no-op when src === dest, returning dest', async () => {
    const tmp = path.join(os.tmpdir(), `cc-local-${Date.now()}.txt`);
    await fs.writeFile(tmp, 'hi');
    const url = await localStorageAdapter.upload(tmp);
    const out = await localStorageAdapter.download(url, tmp);
    expect(out).toBe(tmp);
    expect(await fs.readFile(tmp, 'utf8')).toBe('hi');
    await fs.remove(tmp);
  });

  it('signUrl returns the same file:// URL', async () => {
    const tmp = path.join(os.tmpdir(), `cc-local-${Date.now()}.txt`);
    await fs.writeFile(tmp, 'x');
    const url = await localStorageAdapter.upload(tmp);
    const signed = await localStorageAdapter.signUrl!(url);
    expect(signed).toBe(url);
    await fs.remove(tmp);
  });

  it('delete removes the file', async () => {
    const tmp = path.join(os.tmpdir(), `cc-local-${Date.now()}.txt`);
    await fs.writeFile(tmp, 'gone');
    const url = await localStorageAdapter.upload(tmp);
    await localStorageAdapter.delete(url);
    expect(await fs.pathExists(tmp)).toBe(false);
  });

  it('id is "local"', () => {
    expect(localStorageAdapter.id).toBe('local');
  });
});
