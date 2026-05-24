import fs from 'fs-extra';
import path from 'node:path';
import type { ProviderKey } from '../types';

const ENV_PATH = path.join(process.cwd(), '.env.local');

export function getSecret(key: string): string | undefined {
  return process.env[key];
}

export function mask(value: string | undefined): string {
  if (!value) return '<not set>';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export async function persistSecrets(updates: Partial<Record<ProviderKey | string, string>>): Promise<void> {
  let existing = '';
  if (await fs.pathExists(ENV_PATH)) {
    existing = await fs.readFile(ENV_PATH, 'utf8');
  } else {
    const example = path.join(process.cwd(), '.env.example');
    if (await fs.pathExists(example)) existing = await fs.readFile(example, 'utf8');
  }

  const lines = existing.split('\n');
  const seenKeys = new Set<string>();

  const updated = lines.map((line) => {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=/);
    if (!match) return line;
    const k = match[1];
    if (k in updates) {
      seenKeys.add(k);
      const v = updates[k] ?? '';
      return `${k}=${v}`;
    }
    return line;
  });

  for (const [k, v] of Object.entries(updates)) {
    if (!seenKeys.has(k)) updated.push(`${k}=${v ?? ''}`);
  }

  await fs.writeFile(ENV_PATH, updated.join('\n'), { mode: 0o600 });

  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) process.env[k] = v;
  }
}

export function isMockMode(): boolean {
  return process.env.CLONECAST_MOCK !== 'false';
}
