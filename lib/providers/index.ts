export * from './anthropic';
export * from './elevenlabs';
export * from './openai';
export * from './heygen';
export * from './higgsfield';
export * from './fal';
export * from './hyperframes';

import { validateAnthropicKey } from './anthropic';
import { validateOpenAIKey } from './openai';
import { validateElevenLabsKey } from './elevenlabs';
import { validateHeyGenKey } from './heygen';
import { validateHiggsfieldKey } from './higgsfield';
import { validateFalKey } from './fal';
import type { ProviderKey } from '../types';

export const validators: Record<ProviderKey, (key: string) => Promise<{ ok: boolean; error?: string }>> = {
  ANTHROPIC_API_KEY: validateAnthropicKey,
  OPENAI_API_KEY: validateOpenAIKey,
  ELEVENLABS_API_KEY: validateElevenLabsKey,
  HEYGEN_API_KEY: validateHeyGenKey,
  HIGGSFIELD_API_KEY: validateHiggsfieldKey,
  FAL_API_KEY: validateFalKey,
};
