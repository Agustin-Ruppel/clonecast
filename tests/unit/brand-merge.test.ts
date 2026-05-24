import { describe, it, expect } from 'vitest';
import { mergeBrand } from '@/lib/pipeline/brand-merge';
import type { BrandPack } from '@/lib/types';

const disk: BrandPack = {
  name: 'AIBX',
  display_name: 'Diego',
  title: 'Founder',
  primary_color: '#000000',
  secondary_color: '#FFFFFF',
  font_family: 'Inter',
  social: {},
};

describe('mergeBrand', () => {
  it('returns disk brand when override is null', () => {
    expect(mergeBrand(disk, null)).toEqual(disk);
  });

  it('returns null when both are null', () => {
    expect(mergeBrand(null, null)).toBeNull();
  });

  it('returns cleaned override when disk is null', () => {
    const out = mergeBrand(null, { primary_color: '#ff0000' });
    expect(out?.primary_color).toBe('#ff0000');
  });

  it('shallow-merges override on top of disk', () => {
    const out = mergeBrand(disk, { primary_color: '#ff0000', display_name: 'Otro' });
    expect(out?.primary_color).toBe('#ff0000');
    expect(out?.display_name).toBe('Otro');
    expect(out?.font_family).toBe('Inter'); // untouched
    expect(out?.secondary_color).toBe('#FFFFFF');
  });

  it('does NOT clobber disk values with undefined or empty-string in the override', () => {
    const out = mergeBrand(disk, { primary_color: undefined, display_name: '' });
    expect(out?.primary_color).toBe('#000000');
    expect(out?.display_name).toBe('Diego');
  });
});
