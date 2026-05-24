import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GenerateV2Page from '@/app/generate-v2/page';
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

describe('/generate-v2 page', () => {
  it('renders WriteStep with textarea and Planear video button', async () => {
    render(
      <ToastProvider>
        <GenerateV2Page />
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
