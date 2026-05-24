import { NextResponse } from 'next/server';
import { isMockMode } from '@/lib/core/secrets';

const RATES = {
  anthropic_input_per_mtok: 3,
  anthropic_output_per_mtok: 15,
  elevenlabs_per_1k_chars: 0.30,
  whisper_per_min: 0.006,
  heygen_per_min: 0.40,
  higgsfield_per_sec: 0.30,
  kling_per_sec: 0.10,
};

export async function POST(req: Request) {
  const { mode, duration, brollProvider = 'higgsfield' } = await req.json();

  const shots = mode === 'class' ? Math.max(1, Math.floor(duration / 60)) : Math.ceil(duration / 6);
  const speakChars = duration * 15;
  const brollSec = mode === 'reel-broll' ? duration : Math.floor(duration * 0.3);

  const cost = {
    script: 0.04,
    tts: (speakChars / 1000) * RATES.elevenlabs_per_1k_chars,
    avatar: mode === 'reel-broll' ? 0 : (duration / 60) * RATES.heygen_per_min,
    broll: brollSec * (brollProvider === 'higgsfield' ? RATES.higgsfield_per_sec : RATES.kling_per_sec),
    whisper: (duration / 60) * RATES.whisper_per_min,
    render: 0,
  };

  const total = Object.values(cost).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    mock: isMockMode(),
    duration_sec: duration,
    mode,
    shots,
    broll_provider: brollProvider,
    cost_breakdown: cost,
    total_usd: parseFloat(total.toFixed(2)),
    note: isMockMode() ? 'Mock mode: estimate shown but no real cost incurred' : 'Real cost — billed to your accounts',
  });
}
