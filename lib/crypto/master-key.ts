import { webcrypto } from 'node:crypto';
import keytar from 'keytar';

const SERVICE = 'clonecast';
const KEY_BYTES = 32;

function account(workspace: string): string {
  return `master-key:${workspace}`;
}

export async function getMasterKey(workspace: string): Promise<Buffer> {
  const existing = await keytar.getPassword(SERVICE, account(workspace));
  if (existing) {
    const buf = Buffer.from(existing, 'base64');
    if (buf.length === KEY_BYTES) return buf;
    // Corrupt/legacy value — regenerate.
  }
  const fresh = Buffer.from(webcrypto.getRandomValues(new Uint8Array(KEY_BYTES)));
  await keytar.setPassword(SERVICE, account(workspace), fresh.toString('base64'));
  return fresh;
}

export async function resetMasterKey(workspace: string): Promise<void> {
  await keytar.deletePassword(SERVICE, account(workspace));
}
