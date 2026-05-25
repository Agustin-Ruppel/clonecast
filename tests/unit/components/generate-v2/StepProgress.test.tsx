import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepProgress } from '@/components/generate-v2/StepProgress';

describe('StepProgress', () => {
  it('renders 5 segments (write, plan, broll-picker, composite, review)', () => {
    render(<StepProgress phase="write" />);
    expect(screen.getByTestId('step-segment-write')).toBeTruthy();
    expect(screen.getByTestId('step-segment-plan')).toBeTruthy();
    expect(screen.getByTestId('step-segment-broll-picker')).toBeTruthy();
    expect(screen.getByTestId('step-segment-composite')).toBeTruthy();
    expect(screen.getByTestId('step-segment-review')).toBeTruthy();
  });

  it('marks past + current correctly when phase=composite', () => {
    render(<StepProgress phase="composite" />);
    expect(screen.getByTestId('step-segment-write').getAttribute('data-state')).toBe('past');
    expect(screen.getByTestId('step-segment-plan').getAttribute('data-state')).toBe('past');
    expect(screen.getByTestId('step-segment-broll-picker').getAttribute('data-state')).toBe('past');
    expect(screen.getByTestId('step-segment-composite').getAttribute('data-state')).toBe('current');
    expect(screen.getByTestId('step-segment-review').getAttribute('data-state')).toBe('future');

    // Past + current should be filled accent
    const write = screen.getByTestId('step-segment-write');
    const review = screen.getByTestId('step-segment-review');
    expect(write.className).toContain('bg-accent-500');
    expect(review.className).toContain('bg-ink-800');
  });

  it('marks broll-picker as current with prior phases past', () => {
    render(<StepProgress phase="broll-picker" />);
    expect(screen.getByTestId('step-segment-plan').getAttribute('data-state')).toBe('past');
    expect(screen.getByTestId('step-segment-broll-picker').getAttribute('data-state')).toBe('current');
    expect(screen.getByTestId('step-segment-composite').getAttribute('data-state')).toBe('future');
  });
});
