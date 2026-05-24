import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import {
  setSecret,
  getSecretAsync,
  deleteSecret,
  listSecretKeys,
  invalidateSecretsCache,
} from '@/lib/secrets/store';
import { closeDb } from '@/lib/db/connection';

let currentWs = '';

beforeEach(() => {
  currentWs = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  process.env.CLONECAST_WORKSPACE = currentWs;
  invalidateSecretsCache();
});

afterEach(async () => {
  await closeDb();
  invalidateSecretsCache();
  await fs.remove(path.join(os.homedir(), '.clonecast', `workspace-${currentWs}.db`));
});

describe('secrets store (encrypted)', () => {
  it('set + get round-trip returns the original value', async () => {
    await setSecret('HEYGEN_API_KEY', 'sk-test-abcdef-12345');
    const got = await getSecretAsync('HEYGEN_API_KEY');
    expect(got).toBe('sk-test-abcdef-12345');
  });

  it('returns undefined for unknown keys', async () => {
    const got = await getSecretAsync('NOPE');
    expect(got).toBeUndefined();
  });

  it('overwrites on re-set', async () => {
    await setSecret('X', 'first-value-aaaa');
    await setSecret('X', 'second-value-bbbb');
    const got = await getSecretAsync('X');
    expect(got).toBe('second-value-bbbb');
  });

  it('deleteSecret removes the value', async () => {
    await setSecret('X', 'value-to-remove-xx');
    await deleteSecret('X');
    const got = await getSecretAsync('X');
    expect(got).toBeUndefined();
  });

  it('listSecretKeys returns the set keys', async () => {
    await setSecret('A_API_KEY', 'aaaaaaaaaa');
    await setSecret('B_API_KEY', 'bbbbbbbbbb');
    const keys = (await listSecretKeys()).sort();
    expect(keys).toEqual(['A_API_KEY', 'B_API_KEY']);
  });

  it('different workspaces have isolated secrets', async () => {
    // ws A
    const wsA = `sec-A-${Date.now()}`;
    process.env.CLONECAST_WORKSPACE = wsA;
    invalidateSecretsCache();
    await closeDb();
    await setSecret('SHARED', 'value-in-A-xxxx');

    // ws B
    await closeDb();
    const wsB = `sec-B-${Date.now()}`;
    process.env.CLONECAST_WORKSPACE = wsB;
    invalidateSecretsCache();
    const gotB = await getSecretAsync('SHARED');
    expect(gotB).toBeUndefined();
    await setSecret('SHARED', 'value-in-B-yyyy');

    // back to A
    await closeDb();
    process.env.CLONECAST_WORKSPACE = wsA;
    invalidateSecretsCache();
    const gotA = await getSecretAsync('SHARED');
    expect(gotA).toBe('value-in-A-xxxx');

    // cleanup
    await closeDb();
    await fs.remove(path.join(os.homedir(), '.clonecast', `workspace-${wsA}.db`));
    await fs.remove(path.join(os.homedir(), '.clonecast', `workspace-${wsB}.db`));
  });
});
