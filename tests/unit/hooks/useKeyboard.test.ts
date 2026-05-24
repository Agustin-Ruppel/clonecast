import { describe, it, expect } from 'vitest';
import { useGlobalShortcuts } from '@/hooks/useKeyboard';

describe('useGlobalShortcuts', () => {
  it('exports a hook function', () => {
    expect(typeof useGlobalShortcuts).toBe('function');
  });
});
