import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Empty } from '@/components/ui/Empty';

describe('Empty', () => {
  it('renders title and description', () => {
    render(<Empty title="Nothing here" description="Try adding one." />);
    expect(screen.getByText('Nothing here')).toBeTruthy();
    expect(screen.getByText('Try adding one.')).toBeTruthy();
  });

  it('renders optional CTA link', () => {
    render(<Empty title="Empty" cta={{ label: 'Go', href: '/x' }} />);
    const link = screen.getByText('Go') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/x');
  });
});
