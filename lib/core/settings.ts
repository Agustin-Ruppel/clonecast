import fs from 'fs-extra';
import path from 'node:path';
import { z } from 'zod';
import { HIGGSFIELD_PRESET_IDS, MOTION_INTENSITIES } from '../types';

const STATE_DIR = path.join(process.cwd(), 'state');
const SETTINGS_PATH = path.join(STATE_DIR, 'settings.json');

export const SettingsSchema = z.object({
  voice_provider: z.enum(['elevenlabs', 'cartesia']).default('elevenlabs'),
  video_provider_default: z.enum(['higgsfield', 'kling', 'runway', 'veo']).default('higgsfield'),
  storage_backend: z.enum(['local', 'r2']).default('local'),
  higgsfield_preset_default: z.enum(HIGGSFIELD_PRESET_IDS).optional(),
  motion_intensity_default: z.enum(MOTION_INTENSITIES).optional(),
  voice_mode: z.enum(['native', 'custom']).default('native'),
});
export type Settings = z.infer<typeof SettingsSchema>;

export async function loadSettings(): Promise<Settings> {
  if (!(await fs.pathExists(SETTINGS_PATH))) {
    return SettingsSchema.parse({});
  }
  try {
    const raw = await fs.readJson(SETTINGS_PATH);
    return SettingsSchema.parse(raw);
  } catch {
    return SettingsSchema.parse({});
  }
}

export async function saveSettings(partial: Partial<Settings>): Promise<Settings> {
  await fs.ensureDir(STATE_DIR);
  const current = await loadSettings();
  const merged = SettingsSchema.parse({ ...current, ...partial });
  await fs.writeJson(SETTINGS_PATH, merged, { spaces: 2 });
  try {
    await fs.chmod(SETTINGS_PATH, 0o600);
  } catch {
    // ignore on platforms that don't support chmod
  }
  return merged;
}
