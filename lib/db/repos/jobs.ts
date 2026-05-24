import { getDb } from '../connection';
import type { JobState } from '../../types';

interface JobRow {
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
}

function jobToRow(j: JobState): JobRow {
  return {
    id: j.id,
    created_at: j.created_at,
    status: j.status,
    mode: j.script?.mode ?? 'unknown',
    script_json: JSON.stringify(j.script ?? {}),
    output_path: j.output_path ?? null,
    output_url: j.output_url ?? null,
    cost_usd: j.cost_usd ?? null,
    error: j.error ?? null,
    steps_json: JSON.stringify(j.steps),
  };
}

function rowToJob(row: JobRow): JobState {
  const script = row.script_json ? JSON.parse(row.script_json) : undefined;
  const steps = JSON.parse(row.steps_json);
  return {
    id: row.id,
    created_at: row.created_at,
    status: row.status,
    script: script && Object.keys(script).length > 0 ? script : undefined,
    steps,
    output_path: row.output_path ?? undefined,
    output_url: row.output_url ?? undefined,
    cost_usd: row.cost_usd ?? undefined,
    error: row.error ?? undefined,
  };
}

export async function upsertJob(j: JobState): Promise<void> {
  const db = await getDb();
  const row = jobToRow(j);
  await db
    .insertInto('jobs')
    .values(row)
    .onConflict((oc) => oc.column('id').doUpdateSet(row))
    .execute();
}

export async function loadJob(id: string): Promise<JobState | null> {
  const db = await getDb();
  const row = await db.selectFrom('jobs').selectAll().where('id', '=', id).executeTakeFirst();
  return row ? rowToJob(row as JobRow) : null;
}

export async function listJobs(): Promise<JobState[]> {
  const db = await getDb();
  const rows = await db.selectFrom('jobs').selectAll().orderBy('created_at', 'desc').execute();
  return rows.map((r) => rowToJob(r as JobRow));
}
