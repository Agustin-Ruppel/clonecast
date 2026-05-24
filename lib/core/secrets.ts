import fs from 'fs-extra';
import path from 'node:path';
import type { ProviderKey } from '../types';
import * as store from '../secrets/store';
import { getWorkspaceId } from '../db/connection';

function envPath(): string {
  return path.join(process.cwd(), '.env.local');
}

// In-process mirror, populated by preloadSecrets() and kept fresh by persistSecrets().
let _mirror = new Map<string, string>();
let _mirroredWorkspace: string | null = null;

/**
 * Preload all encrypted secrets for the active workspace into the in-process mirror.
 * Call this at the start of any API route that reads secrets via getSecret().
 * Cheap to call repeatedly — short-circuits when already loaded for the current workspace.
 */
export async function preloadSecrets(): Promise<void> {
  const ws = getWorkspaceId();
  if (_mirroredWorkspace === ws && _mirror.size > 0) return;
  const keys = await store.listSecretKeys();
  const next = new Map<string, string>();
  for (const k of keys) {
    const v = await store.getSecretAsync(k);
    if (v !== undefined) next.set(k, v);
  }
  _mirror = next;
  _mirroredWorkspace = ws;
}

export function invalidateSecretsMirror(): void {
  _mirror.clear();
  _mirroredWorkspace = null;
  store.invalidateSecretsCache();
}

export function getSecret(key: string): string | undefined {
  // .env.local takes precedence for flags and dev overrides (NODE_ENV, ports).
  // For real API keys, the encrypted mirror is the source of truth.
  const envValue = process.env[key];
  if (envValue !== undefined && envValue !== '') return envValue;
  return _mirror.get(key);
}

export function mask(value: string | undefined): string {
  if (!value) return '<not set>';
  if (value.length <= 8) return '****';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export async function persistSecrets(
  updates: Partial<Record<ProviderKey | string, string>>,
): Promise<void> {
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined || v === '') {
      await store.deleteSecret(k);
      _mirror.delete(k);
    } else {
      await store.setSecret(k, v);
      _mirror.set(k, v);
      // Also live-update process.env so the same-request reader sees the new value
      // even without going through the mirror.
      process.env[k] = v;
    }
  }
  // Ensure mirror is considered loaded for the current workspace after a write.
  if (_mirroredWorkspace === null) _mirroredWorkspace = getWorkspaceId();
}

/**
 * Internal test gate. Only true when the vitest setup (`tests/setup.ts`) sets
 * `CLONECAST_TEST_FIXTURES=true`. Production code paths NEVER set this — real
 * APIs are always called, and missing keys surface as clear errors.
 *
 * Do not expose this in UI, env examples, or docs.
 */
export function isTestFixtureMode(): boolean {
  return process.env.CLONECAST_TEST_FIXTURES === 'true';
}

/**
 * One-shot migration: if .env.local contains any API_KEY-like values, copy them into
 * the encrypted store and replace them with a comment line in .env.local. Idempotent.
 */
export async function migrateLegacyEnvSecrets(): Promise<{ migrated: string[] }> {
  const envFile = envPath();
  if (!(await fs.pathExists(envFile))) return { migrated: [] };
  const text = await fs.readFile(envFile, 'utf8');
  const lines = text.split('\n');
  const migrated: string[] = [];
  const newLines: string[] = [];
  for (const line of lines) {
    // Only migrate keys that look like real API tokens / IDs.
    const m = line.match(/^([A-Z_][A-Z0-9_]*(?:_API_KEY|_VOICE_ID|_AVATAR_ID))=(.+)$/);
    if (m && m[2].length > 8) {
      await store.setSecret(m[1], m[2]);
      _mirror.set(m[1], m[2]);
      migrated.push(m[1]);
      newLines.push(`# Migrated to encrypted store: ${m[1]}`);
    } else {
      newLines.push(line);
    }
  }
  if (migrated.length > 0) {
    await fs.writeFile(envFile, newLines.join('\n'), { mode: 0o600 });
  }
  return { migrated };
}
