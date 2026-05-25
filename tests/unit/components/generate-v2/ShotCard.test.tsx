import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShotCard } from '@/components/generate-v2/ShotCard';
import type { PlannedShot } from '@/lib/planner/types';

const baseShot: PlannedShot = {
  text: 'Hola este es un texto para el shot',
  type: 'avatar',
  duration_sec: 4,
  visual_hint_es: 'Plano medio',
  broll_prompt_en: null,
  caption_style: 'pill-karaoke',
};

describe('ShotCard', () => {
  it('renders shot text and duration', () => {
    render(
      <ShotCard
        shot={baseShot}
        index={0}
        onClick={() => {}}
        onRegenerate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByText(/Hola este es un texto/)).toBeTruthy();
    expect(screen.getByText('4s')).toBeTruthy();
  });

  it('calls onClick when the card is clicked', () => {
    const onClick = vi.fn();
    render(
      <ShotCard
        shot={baseShot}
        index={2}
        onClick={onClick}
        onRegenerate={() => {}}
        onDelete={() => {}}
      />,
    );
    fireEvent.click(screen.getByTestId('shot-card-2'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('fires onRegenerate/onDelete without bubbling to onClick', () => {
    const onClick = vi.fn();
    const onRegenerate = vi.fn();
    const onDelete = vi.fn();
    render(
      <ShotCard
        shot={baseShot}
        index={1}
        onClick={onClick}
        onRegenerate={onRegenerate}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByTestId('shot-card-1-regenerate'));
    fireEvent.click(screen.getByTestId('shot-card-1-delete'));
    expect(onRegenerate).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows broll-only without throwing', () => {
    render(
      <ShotCard
        shot={{ ...baseShot, type: 'broll-only', broll_prompt_en: 'desert sunset' }}
        index={3}
        onClick={() => {}}
        onRegenerate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByTestId('shot-card-3')).toBeTruthy();
  });
});
