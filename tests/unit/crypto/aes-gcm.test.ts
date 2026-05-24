import { describe, it, expect } from 'vitest';
import { webcrypto } from 'node:crypto';
import { encrypt, decrypt } from '../../../lib/crypto/aes-gcm';

function randomKey(): Buffer {
  return Buffer.from(webcrypto.getRandomValues(new Uint8Array(32)));
}

describe('aes-gcm', () => {
  it('round-trips plaintext through encrypt + decrypt', async () => {
    const key = randomKey();
    const plaintext = Buffer.from('hello clonecast secrets ' + Math.random(), 'utf8');
    const box = await encrypt(plaintext, key);
    expect(box.iv.length).toBe(12);
    expect(box.ciphertext.length).toBeGreaterThan(0);
    const recovered = await decrypt(box, key);
    expect(recovered.equals(plaintext)).toBe(true);
  });

  it('throws when decrypting with the wrong key', async () => {
    const key = randomKey();
    const other = randomKey();
    const box = await encrypt(Buffer.from('payload'), key);
    await expect(decrypt(box, other)).rejects.toThrow();
  });

  it('throws when key is not 32 bytes', async () => {
    await expect(encrypt(Buffer.from('x'), Buffer.alloc(16))).rejects.toThrow(/32-byte key/);
  });

  // Smoke test for master-key.ts — requires OS keychain, run manually.
  it.skip('master-key persists across calls (requires OS keychain — run manually)', async () => {
    // const { getMasterKey, resetMasterKey } = await import('../../../lib/crypto/master-key');
    // const ws = `test-${Date.now()}`;
    // const a = await getMasterKey(ws);
    // const b = await getMasterKey(ws);
    // expect(a.equals(b)).toBe(true);
    // await resetMasterKey(ws);
  });
});
