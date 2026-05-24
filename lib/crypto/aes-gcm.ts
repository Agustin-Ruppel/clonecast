import { webcrypto } from 'node:crypto';

export interface SealedBox {
  ciphertext: Buffer;
  iv: Buffer;
}

const IV_BYTES = 12;
const KEY_BYTES = 32;

async function importKey(key: Buffer): Promise<CryptoKey> {
  // webcrypto requires a fresh ArrayBuffer view, not a Node Buffer slice that
  // may share an oversized underlying buffer.
  const raw = new Uint8Array(key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength));
  return webcrypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encrypt(plaintext: Buffer, key: Buffer): Promise<SealedBox> {
  if (key.length !== KEY_BYTES) {
    throw new Error(`AES-256-GCM requires a 32-byte key (got ${key.length})`);
  }
  const iv = Buffer.from(webcrypto.getRandomValues(new Uint8Array(IV_BYTES)));
  const cryptoKey = await importKey(key);
  const ctBuf = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    new Uint8Array(plaintext.buffer, plaintext.byteOffset, plaintext.byteLength),
  );
  return { ciphertext: Buffer.from(ctBuf), iv };
}

export async function decrypt(box: SealedBox, key: Buffer): Promise<Buffer> {
  if (key.length !== KEY_BYTES) {
    throw new Error(`AES-256-GCM requires a 32-byte key (got ${key.length})`);
  }
  const cryptoKey = await importKey(key);
  const ptBuf = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv: box.iv },
    cryptoKey,
    new Uint8Array(box.ciphertext.buffer, box.ciphertext.byteOffset, box.ciphertext.byteLength),
  );
  return Buffer.from(ptBuf);
}
