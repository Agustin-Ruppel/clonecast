'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SEQ_TIMEOUT = 1000;

export function useGlobalShortcuts(): void {
  const router = useRouter();
  useEffect(() => {
    let seqBuffer = '';
    let seqTimer: ReturnType<typeof setTimeout> | null = null;
    const reset = (): void => {
      seqBuffer = '';
      if (seqTimer) {
        clearTimeout(seqTimer);
        seqTimer = null;
      }
    };

    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null;
      const isTyping =
        !!t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable);

      // Allow cmd+enter even inside textareas
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        document.dispatchEvent(new CustomEvent('clonecast:submit'));
        return;
      }

      if (isTyping) return;

      if (e.key === '?') {
        document.dispatchEvent(new CustomEvent('clonecast:show-shortcuts'));
        return;
      }
      if (e.key === 'Escape') {
        document.dispatchEvent(new CustomEvent('clonecast:escape'));
        return;
      }

      if (e.key === 'g' || seqBuffer === 'g') {
        seqBuffer += e.key;
        if (seqTimer) clearTimeout(seqTimer);
        seqTimer = setTimeout(reset, SEQ_TIMEOUT);
        if (seqBuffer === 'gg') {
          reset();
          router.push('/generate');
        } else if (seqBuffer === 'gl') {
          reset();
          router.push('/library');
        } else if (seqBuffer === 'gs') {
          reset();
          router.push('/settings');
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);
}
