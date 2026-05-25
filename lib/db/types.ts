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
  broll_options: BrollOptionsTable;
  style_thumbnails: StyleThumbnailsTable;
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
  /** URL of the rendered avatar+voice track (background-generated). */
  avatar_video_url: string | null;
}

export interface BrollOptionsTable {
  id: string;
  job_id: string;
  shot_index: number;
  video_url: string;
  thumbnail_url: string | null;
  model_used: string;
  style: string;
  generated_at: string;
  chosen: number;
}

export interface StyleThumbnailsTable {
  style_id: string;
  thumbnail_url: string;
  label_es: string;
  description_es: string;
  generated_at: string;
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
