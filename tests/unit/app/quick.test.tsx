import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import QuickPage from '@/app/quick/page';
import { ToastProvider } from '@/components/ui/Toast';

beforeEach(() => {
  const fetchMock = vi.fn(async (url: string) => {
    if (typeof url === 'string' && url.includes('/api/settings')) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ avatars: [], cached: false, mock: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('/quick page', () => {
  it('renders the no-camera flow with textarea and VoicePicker primary', async () => {
    render(
      <ToastProvider>
        <QuickPage />
      </ToastProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('write-textarea')).toBeTruthy();
    });
    expect(screen.getByTestId('planear-video')).toBeTruthy();
    // VoicePicker is rendered as a primary section
    expect(screen.getByTestId('quick-voice-section')).toBeTruthy();
    // AvatarPicker is NOT rendered on /quick
    expect(screen.queryByText(/Elegí tu avatar/i)).toBeNull();
  });
});
