import { isTestFixtureMode } from '../core/secrets';

interface PollResult {
  status: string;
  video_url?: string;
}

/**
 * Polls `fn` with exponential backoff until it returns a completed or failed
 * status. Steps: 2s, 4s, 8s, 16s, 30s, 30s, ... capped at 30s. Max wall time
 * defaults to 10 minutes. Test-fixture mode short-circuits and only calls fn once.
 *
 * @param fn the polling fn — must throw or return a status string
 * @param opts.maxMs total budget in ms (default 10 minutes)
 * @param opts.respectRetryAfter when true and fn throws with `.retryAfterMs`, use it
 */
export async function pollUntilDone<T extends PollResult>(
  fn: () => Promise<T>,
  opts: { maxMs?: number; respectRetryAfter?: boolean } = {},
): Promise<T> {
  if (isTestFixtureMode()) return fn();
  const maxMs = opts.maxMs ?? 10 * 60 * 1000;
  const start = Date.now();
  const backoff = [2_000, 4_000, 8_000, 16_000, 30_000];
  let attempt = 0;
  while (Date.now() - start < maxMs) {
    let result: T;
    try {
      result = await fn();
    } catch (err) {
      const retry = opts.respectRetryAfter
        ? (err as { retryAfterMs?: number }).retryAfterMs
        : undefined;
      const wait = retry ?? backoff[Math.min(attempt, backoff.length - 1)]!;
      await sleep(wait);
      attempt++;
      continue;
    }
    const status = result.status;
    if (status === 'completed' || status === 'COMPLETED') return result;
    if (status === 'failed' || status === 'FAILED') throw new Error('Job failed');
    const wait = backoff[Math.min(attempt, backoff.length - 1)]!;
    await sleep(wait);
    attempt++;
  }
  throw new Error('Timeout polling job');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
