import type { Generated } from 'kysely';

export interface Database {
  jobs: JobsTable;
  creator_profile: CreatorProfileTable;
  settings: SettingsTable;
  brand_pack: BrandPackTable;
  character_pack: CharacterPackTable;
  presets_custom: PresetsTable;
  avatars_cache: AvatarsCacheTable;
  secrets: SecretsTable;
  schema_version: SchemaVersionTable;
}

export interface JobsTable {
  id: string;
  created_at: string;
  status: 'pending' | 'running' | 'done' | 'error';
  mode: string;
  script_json: string;
  output_path: string | null;
  output_url: string | null;
  cost_usd: number | null;
  error: string | null;
  steps_json: string;
  /** Upstream provider job id (e.g. HeyGen video_id) for webhook lookup. */
  provider_job_id: string | null;
}

export interface CreatorProfileTable {
  id: Generated<number>;
  name: string;
  language: string;
  type: string;
  platforms_json: string;
  updated_at: string;
}

export interface SettingsTable {
  key: string;
  value_json: string;
  updated_at: string;
}

export interface BrandPackTable {
  id: Generated<number>;
  data_json: string;
  updated_at: string;
}

export interface CharacterPackTable {
  id: Generated<number>;
  meta_json: string;
  photo_count: number;
  updated_at: string;
}

export interface PresetsTable {
  id: string;
  data_json: string;
  created_at: string;
}

export interface AvatarsCacheTable {
  id: string;
  provider: string;
  data_json: string;
  fetched_at: string;
}

export interface SecretsTable {
  key: string;
  ciphertext_b64: string;
  iv_b64: string;
  updated_at: string;
}

export interface SchemaVersionTable {
  version: number;
  applied_at: string;
}
