import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.createTable('broll_options')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('job_id', 'text', (c) => c.notNull())
    .addColumn('shot_index', 'integer', (c) => c.notNull())
    .addColumn('video_url', 'text', (c) => c.notNull())
    .addColumn('thumbnail_url', 'text')
    .addColumn('model_used', 'text', (c) => c.notNull())
    .addColumn('style', 'text', (c) => c.notNull())
    .addColumn('generated_at', 'text', (c) => c.notNull())
    .addColumn('chosen', 'integer', (c) => c.notNull().defaultTo(0))
    .execute();

  await db.schema.createIndex('broll_options_job_shot_idx')
    .on('broll_options').columns(['job_id', 'shot_index'])
    .execute();

  await db.schema.createTable('style_thumbnails')
    .addColumn('style_id', 'text', (c) => c.primaryKey())
    .addColumn('thumbnail_url', 'text', (c) => c.notNull())
    .addColumn('label_es', 'text', (c) => c.notNull())
    .addColumn('description_es', 'text', (c) => c.notNull())
    .addColumn('generated_at', 'text', (c) => c.notNull())
    .execute();

  await db.schema.alterTable('jobs')
    .addColumn('avatar_video_url', 'text')
    .execute();
}
