import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepProgress } from '@/components/generate-v2/StepProgress';

describe('StepProgress', () => {
  it('renders 4 segments', () => {
    render(<StepProgress phase="write" />);
    expect(screen.getByTestId('step-segment-write')).toBeTruthy();
    expect(screen.getByTestId('step-segment-plan')).toBeTruthy();
    expect(screen.getByTestId('step-segment-render')).toBeTruthy();
    expect(screen.getByTestId('step-segment-review')).toBeTruthy();
  });

  it('marks past steps as past and current as current when phase=render', () => {
    render(<StepProgress phase="render" />);
    expect(screen.getByTestId('step-segment-write').getAttribute('data-state')).toBe('past');
    expect(screen.getByTestId('step-segment-plan').getAttribute('data-state')).toBe('past');
    expect(screen.getByTestId('step-segment-render').getAttribute('data-state')).toBe('current');
    expect(screen.getByTestId('step-segment-review').getAttribute('data-state')).toBe('future');

    // Past + current should be filled accent
    const write = screen.getByTestId('step-segment-write');
    const review = screen.getByTestId('step-segment-review');
    expect(write.className).toContain('bg-accent-500');
    expect(review.className).toContain('bg-ink-800');
  });
});
