import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvatarPicker } from '@/components/AvatarPicker';

const MOCK_AVATARS = [
  { id: 'a1', name: 'Alex', preview_image_url: '/api/mock-avatar/1' },
  { id: 'a2', name: 'Bea', preview_image_url: '/api/mock-avatar/2' },
];

beforeEach(() => {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ avatars: MOCK_AVATARS, cached: false, mock: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  // happy-dom provides global Response — we just override fetch.
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AvatarPicker', () => {
  it('renders fetched avatars and fires onChange when clicked', async () => {
    const onChange = vi.fn();
    render(<AvatarPicker selected={null} onChange={onChange} />);
    await waitFor(() => expect(screen.getByText('Alex')).toBeTruthy());
    fireEvent.click(screen.getByText('Alex'));
    expect(onChange).toHaveBeenCalledWith('a1');
  });

  it('renders "Sin avatar" tile when allowNone is true', async () => {
    render(<AvatarPicker selected={null} onChange={() => {}} allowNone />);
    await waitFor(() => expect(screen.getByText('Sin avatar')).toBeTruthy());
  });
});
