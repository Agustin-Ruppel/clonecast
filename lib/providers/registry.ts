import { isMockMode } from '../core/secrets';
import type { ProviderId, VideoProvider, VoiceProvider } from './contracts';
import { mockVideoProvider, mockVoiceProvider } from './_mocks';

const VIDEO_IDS: ReadonlyArray<ProviderId> = ['higgsfield', 'kling', 'runway', 'veo', 'heygen', 'mock'];
const VOICE_IDS: ReadonlyArray<ProviderId> = ['elevenlabs', 'cartesia', 'mock'];

export function getVideoProvider(id: ProviderId): VideoProvider {
  if (!VIDEO_IDS.includes(id)) {
    throw new Error(`Unknown video provider: ${id}`);
  }
  if (isMockMode()) {
    return mockVideoProvider(id);
  }
  // Phase B will adapt real adapters (heygen, higgsfield, etc.) to the VideoProvider contract.
  throw new Error(
    `Real video provider for ${id} not yet adapted to VideoProvider contract — see Phase B`
  );
}

export function getVoiceProvider(id: ProviderId): VoiceProvider {
  if (!VOICE_IDS.includes(id)) {
    throw new Error(`Unknown voice provider: ${id}`);
  }
  if (isMockMode()) {
    return mockVoiceProvider(id);
  }
  // Phase B will adapt real adapters (elevenlabs, cartesia) to the VoiceProvider contract.
  throw new Error(
    `Real voice provider for ${id} not yet adapted to VoiceProvider contract — see Phase B`
  );
}
