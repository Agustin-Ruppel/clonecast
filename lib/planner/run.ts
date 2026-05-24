import Anthropic from '@anthropic-ai/sdk';
import { getSecret, isMockMode } from '../core/secrets';
import { ShotPlanSchema, type ShotPlan, type PlannedShot, type PlannerInput } from './types';

export interface PlannerAvatarInfo {
  default_voice_id?: string;
}

export type PlannerOpts = PlannerInput & { avatar?: PlannerAvatarInfo | null };

const SYSTEM_PROMPT = `You are a video shot planner for social media reels.

Input: a guion (script in Spanish or English), format (9:16/16:9/1:1), mode hint (auto/avatar/broll-only/mixed), optional avatarId.

Output STRICT JSON only:
{
  "shots": [{
    "text": "what the voice says verbatim",
    "type": "avatar" | "avatar-with-broll" | "broll-only",
    "duration_sec": 3-7,
    "visual_hint_es": "what we see, in Spanish",
    "broll_prompt_en": "cinematic English prompt for video model" | null,
    "caption_style": "pill-karaoke" | "kinetic-slam" | "highlight" | "emoji-pop" | "gradient-fill" | "neon-glow" | (other)
  }],
  "total_duration_sec": number,
  "estimated_cost_usd": number,
  "rationale": "1-2 sentence Spanish explanation"
}

Rules:
- Hook (1st): type='avatar', caption_style='kinetic-slam'
- CTA (last if it sounds like one): type='avatar', caption_style='neon-glow'
- Body: prefer 'avatar-with-broll' when text mentions concrete nouns
- 'broll-only' sparingly, only for purely descriptive moments
- broll_prompt_en is null when type='avatar'
- Total duration close to natural speech length (~15 chars/sec)`;

export async function planShots(opts: PlannerOpts): Promise<ShotPlan> {
  const nativeVoiceId = opts.avatar?.default_voice_id;
  if (isMockMode()) {
    const plan = deterministicPlan(opts);
    if (nativeVoiceId) {
      plan.voice_id = nativeVoiceId;
      plan.voice_source = 'native';
    }
    return plan;
  }
  const key = getSecret('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');
  const client = new Anthropic({ apiKey: key });
  const r = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Format: ${opts.format}\nMode: ${opts.mode}\nGuion:\n${opts.guion}` }],
  });
  const text = r.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('No JSON in planner response');
  const plan = ShotPlanSchema.parse(JSON.parse(m[0]));
  if (nativeVoiceId && !plan.voice_id) {
    plan.voice_id = nativeVoiceId;
    plan.voice_source = 'native';
  }
  return plan;
}

function deterministicPlan(opts: { guion: string; format: string }): ShotPlan {
  const sentences = opts.guion.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const shots: PlannedShot[] = sentences.map((s, i) => {
    const isHook = i === 0;
    const isCta = i === sentences.length - 1 && /seguime|comparti|comenta|dale like|próximo|seguíme|seguinos/i.test(s);
    const hasConcreteNoun = /laptop|oficina|café|gente|pantalla|libro|teléfono|dashboard|procesos|automatiz/i.test(s);
    const type: PlannedShot['type'] = isHook || isCta ? 'avatar' : hasConcreteNoun ? 'avatar-with-broll' : 'avatar';
    return {
      text: s,
      type,
      duration_sec: Math.max(3, Math.min(7, Math.ceil(s.length / 15))),
      visual_hint_es: isHook ? 'Hook a cámara' : hasConcreteNoun ? `Visual de: ${s.slice(0, 40)}` : 'A cámara',
      broll_prompt_en: type === 'avatar' ? null : `Cinematic scene illustrating: ${s.slice(0, 60)}, warm light, shallow depth of field`,
      caption_style: isHook ? 'kinetic-slam' : isCta ? 'neon-glow' : 'pill-karaoke',
    };
  });
  const total = shots.reduce((a, s) => a + s.duration_sec, 0);
  return {
    shots,
    total_duration_sec: total,
    estimated_cost_usd: total * 0.12,
    rationale: `Plan determinístico (mock): ${shots.length} shots de ${total}s total.`,
  };
}
