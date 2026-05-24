import type { Kysely } from 'kysely';

/**
 * Add provider_job_id column to jobs so the HeyGen webhook receiver can look
 * up local jobs by the upstream video_id without scanning steps_json blobs.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('jobs').addColumn('provider_job_id', 'text').execute();
  await db.schema
    .createIndex('jobs_provider_job_id_idx')
    .on('jobs')
    .column('provider_job_id')
    .execute();
}
