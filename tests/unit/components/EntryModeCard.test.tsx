import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntryModeCard } from '@/components/EntryModeCard';

describe('EntryModeCard', () => {
  it('renders title, description and CTA link with href', () => {
    render(
      <EntryModeCard
        icon="✨"
        title="Reel con IA"
        description="Pegás un guion, la IA arma el plan."
        ctaLabel="Crear"
        href="/generate"
      />,
    );
    expect(screen.getByText('Reel con IA')).toBeTruthy();
    expect(screen.getByText('Pegás un guion, la IA arma el plan.')).toBeTruthy();
    const link = screen.getByRole('link', { name: /crear/i }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/generate');
  });

  it('renders the icon', () => {
    render(
      <EntryModeCard
        icon="📷"
        title="Sin cámara"
        description="ElevenLabs + B-roll."
        ctaLabel="Crear"
        href="/quick"
      />,
    );
    expect(screen.getByText('📷')).toBeTruthy();
  });
});
