import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { migrateLegacyEnvSecrets, invalidateSecretsMirror } from '@/lib/core/secrets';
import { getSecretAsync, invalidateSecretsCache } from '@/lib/secrets/store';
import { closeDb } from '@/lib/db/connection';

let currentWs = '';
let tmpDir = '';
let originalCwd = '';
let envPath = '';

beforeEach(async () => {
  currentWs = `mig-env-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  process.env.CLONECAST_WORKSPACE = currentWs;
  invalidateSecretsCache();
  invalidateSecretsMirror();

  originalCwd = process.cwd();
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clonecast-mig-'));
  process.chdir(tmpDir);
  envPath = path.join(tmpDir, '.env.local');
});

afterEach(async () => {
  process.chdir(originalCwd);
  await closeDb();
  invalidateSecretsCache();
  invalidateSecretsMirror();
  await fs.remove(path.join(os.homedir(), '.clonecast', `workspace-${currentWs}.db`));
  await fs.remove(tmpDir);
});

describe('migrateLegacyEnvSecrets', () => {
  it('migrates API_KEY values out of .env.local into the encrypted store', async () => {
    await fs.writeFile(
      envPath,
      [
        '# Some flag',
        'CLONECAST_MOCK=false',
        'HEYGEN_API_KEY=sk-aaaaaaaaaaaaa',
        'ELEVENLABS_VOICE_ID=voice-xxxxxxxx',
      ].join('\n'),
    );

    const r = await migrateLegacyEnvSecrets();
    expect(r.migrated.sort()).toEqual(['ELEVENLABS_VOICE_ID', 'HEYGEN_API_KEY']);

    expect(await getSecretAsync('HEYGEN_API_KEY')).toBe('sk-aaaaaaaaaaaaa');
    expect(await getSecretAsync('ELEVENLABS_VOICE_ID')).toBe('voice-xxxxxxxx');

    const text = await fs.readFile(envPath, 'utf8');
    expect(text).toContain('# Migrated to encrypted store: HEYGEN_API_KEY');
    expect(text).toContain('# Migrated to encrypted store: ELEVENLABS_VOICE_ID');
    expect(text).toContain('CLONECAST_MOCK=false');
    expect(text).not.toMatch(/^HEYGEN_API_KEY=/m);
  });

  it('is idempotent — second run migrates nothing', async () => {
    await fs.writeFile(envPath, 'HEYGEN_API_KEY=sk-aaaaaaaaaaaaa\n');
    await migrateLegacyEnvSecrets();
    const second = await migrateLegacyEnvSecrets();
    expect(second.migrated).toEqual([]);
  });

  it('returns empty when .env.local does not exist', async () => {
    const r = await migrateLegacyEnvSecrets();
    expect(r.migrated).toEqual([]);
  });

  it('skips short/placeholder values', async () => {
    await fs.writeFile(envPath, 'HEYGEN_API_KEY=short\n');
    const r = await migrateLegacyEnvSecrets();
    expect(r.migrated).toEqual([]);
  });
});
