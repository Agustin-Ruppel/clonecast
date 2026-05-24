import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AvatarPicker } from '@/components/AvatarPicker';

const MOCK_AVATARS = [
  { id: 'a1', name: 'Alex', preview_image_url: '/api/mock-avatar/1' },
  { id: 'a2', name: 'Bea', preview_image_url: '/api/mock-avatar/2' },
];

function mockFetchWith(avatars: Array<{ id: string; name: string; preview_image_url: string }>) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ avatars, cached: false, mock: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
}

beforeEach(() => {
  mockFetchWith(MOCK_AVATARS);
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

  it('renders the search input', async () => {
    render(<AvatarPicker selected={null} onChange={() => {}} />);
    await waitFor(() => expect(screen.getByText('Alex')).toBeTruthy());
    const search = screen.getByPlaceholderText('Buscar avatar por nombre…');
    expect(search).toBeTruthy();
  });

  it('filters avatars by search query', async () => {
    const many = Array.from({ length: 30 }).map((_, i) => ({
      id: `id${i}`,
      name: i === 7 ? 'Leo' : `Person${i}`,
      preview_image_url: `/x/${i}`,
    }));
    mockFetchWith(many);
    render(<AvatarPicker selected={null} onChange={() => {}} />);
    await waitFor(() => expect(screen.getByText('Leo')).toBeTruthy());
    const search = screen.getByPlaceholderText('Buscar avatar por nombre…') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'leo' } });
    await waitFor(() => {
      expect(screen.getByText('Leo')).toBeTruthy();
      expect(screen.queryByText('Person0')).toBeNull();
    });
  });
});
