import { request } from 'undici';
import { getSecret, isTestFixtureMode, preloadSecrets } from '../core/secrets';

export type VoiceProviderStatus = 'ok' | 'error' | 'unconfigured';

export interface VoiceHealth {
  heygen: VoiceProviderStatus;
  elevenlabs: VoiceProviderStatus;
  defaultPick: 'heygen' | 'elevenlabs';
}

/**
 * Lightweight health probe for the two co-equal voice providers.
 *
 * - In test-fixture mode (no real network), returns deterministic ok/ok.
 * - Returns `unconfigured` when the API key is missing.
 * - Picks ElevenLabs as default only if HeyGen is not OK and ElevenLabs is OK.
 *   Otherwise defaults to HeyGen.
 */
export async function checkVoiceProviders(): Promise<VoiceHealth> {
  if (isTestFixtureMode()) {
    return { heygen: 'ok', elevenlabs: 'ok', defaultPick: 'heygen' };
  }
  await preloadSecrets();
  const heygenKey = getSecret('HEYGEN_API_KEY');
  const elevenKey = getSecret('ELEVENLABS_API_KEY');

  const heygenProbe = heygenKey
    ? request('https://api.heygen.com/v2/voices', {
        method: 'GET',
        headers: { 'X-Api-Key': heygenKey },
        headersTimeout: 3000,
        bodyTimeout: 3000,
      })
    : Promise.reject(new Error('unconfigured'));

  const elevenProbe = elevenKey
    ? request('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: { 'xi-api-key': elevenKey },
        headersTimeout: 3000,
        bodyTimeout: 3000,
      })
    : Promise.reject(new Error('unconfigured'));

  const checks = await Promise.allSettled([heygenProbe, elevenProbe]);

  const heygen: VoiceProviderStatus = !heygenKey
    ? 'unconfigured'
    : checks[0].status === 'fulfilled' && checks[0].value.statusCode === 200
      ? 'ok'
      : 'error';
  const elevenlabs: VoiceProviderStatus = !elevenKey
    ? 'unconfigured'
    : checks[1].status === 'fulfilled' && checks[1].value.statusCode === 200
      ? 'ok'
      : 'error';

  let defaultPick: 'heygen' | 'elevenlabs' = 'heygen';
  if (heygen !== 'ok' && elevenlabs === 'ok') defaultPick = 'elevenlabs';

  return { heygen, elevenlabs, defaultPick };
}
