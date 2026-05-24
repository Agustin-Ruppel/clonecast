import type { Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('schema_version')
    .addColumn('version', 'integer', (c) => c.primaryKey())
    .addColumn('applied_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('jobs')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('created_at', 'text', (c) => c.notNull())
    .addColumn('status', 'text', (c) => c.notNull())
    .addColumn('mode', 'text', (c) => c.notNull())
    .addColumn('script_json', 'text', (c) => c.notNull())
    .addColumn('output_path', 'text')
    .addColumn('output_url', 'text')
    .addColumn('cost_usd', 'real')
    .addColumn('error', 'text')
    .addColumn('steps_json', 'text', (c) => c.notNull())
    .execute();

  await db.schema.createIndex('jobs_created_at_idx').on('jobs').column('created_at').execute();
  await db.schema.createIndex('jobs_status_idx').on('jobs').column('status').execute();

  await db.schema
    .createTable('creator_profile')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('language', 'text', (c) => c.notNull())
    .addColumn('type', 'text', (c) => c.notNull())
    .addColumn('platforms_json', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('settings')
    .addColumn('key', 'text', (c) => c.primaryKey())
    .addColumn('value_json', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('brand_pack')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('data_json', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('character_pack')
    .addColumn('id', 'integer', (c) => c.primaryKey().autoIncrement())
    .addColumn('meta_json', 'text', (c) => c.notNull())
    .addColumn('photo_count', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('presets_custom')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('data_json', 'text', (c) => c.notNull())
    .addColumn('created_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('avatars_cache')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('provider', 'text', (c) => c.notNull())
    .addColumn('data_json', 'text', (c) => c.notNull())
    .addColumn('fetched_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('secrets')
    .addColumn('key', 'text', (c) => c.primaryKey())
    .addColumn('ciphertext_b64', 'text', (c) => c.notNull())
    .addColumn('iv_b64', 'text', (c) => c.notNull())
    .addColumn('updated_at', 'text', (c) => c.notNull())
    .execute();
}
