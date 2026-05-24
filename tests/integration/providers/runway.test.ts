import { describe, it, expect, beforeEach } from 'vitest';
import { validateRunwayKey, runwayVideoProvider } from '@/lib/providers/runway';

beforeEach(() => { process.env.CLONECAST_MOCK = 'true'; });

describe('runway (mock mode)', () => {
  it('validates a key without network', async () => {
    const r = await validateRunwayKey('mock-key');
    expect(r.ok).toBe(true);
  });
  it('exposes a VideoProvider with id=runway', () => {
    expect(runwayVideoProvider.id).toBe('runway');
    expect(runwayVideoProvider.label).toBeTruthy();
  });
  it('generates and polls a job in mock mode', async () => {
    const job = await runwayVideoProvider.generate({ prompt: 'test', durationSec: 5, aspectRatio: '9:16' });
    expect(job.jobId).toBeTruthy();
    const polled = await runwayVideoProvider.poll(job.jobId);
    expect(polled.status).toBe('completed');
    expect(polled.videoUrl).toBeTruthy();
  });
  it('estimates cost based on duration', async () => {
    const est = await runwayVideoProvider.estimate({ prompt: 'x', durationSec: 5, aspectRatio: '9:16' });
    expect(est).toBeGreaterThan(0);
  });
});
