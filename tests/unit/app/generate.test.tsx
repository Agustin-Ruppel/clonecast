import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GeneratePage from '@/app/generate/page';
import { ToastProvider } from '@/components/ui/Toast';

beforeEach(() => {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ avatars: [], cached: false, mock: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('/generate page', () => {
  it('renders WriteStep with textarea and Planear video button', async () => {
    render(
      <ToastProvider>
        <GeneratePage />
      </ToastProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('write-textarea')).toBeTruthy();
    });
    expect(screen.getByTestId('planear-video')).toBeTruthy();
    // Renders the 4-step progress
    expect(screen.getByTestId('step-progress')).toBeTruthy();
  });
});
