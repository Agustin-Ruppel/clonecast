/**
 * Helper to activate the per-request workspace by reading the `cc_ws` cookie
 * and writing it into process.env.CLONECAST_WORKSPACE before any DB call.
 *
 * NOTE: this is a pragmatic single-tenant local-dev pattern — process.env is
 * shared across concurrent requests. For multi-user deployments, refactor
 * getDb() to accept a workspace param.
 */
import { cookies } from 'next/headers';

export async function activateRequestWorkspace(): Promise<void> {
  try {
    const c = await cookies();
    const ws = c.get('cc_ws')?.value;
    if (ws && /^[a-z0-9-]{1,40}$/.test(ws)) {
      process.env.CLONECAST_WORKSPACE = ws;
    }
  } catch {
    // Called outside a request scope (e.g. tests) — fall back to env default.
  }
}
