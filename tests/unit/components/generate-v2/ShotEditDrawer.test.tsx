import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShotEditDrawer } from '@/components/generate-v2/ShotEditDrawer';
import type { PlannedShot } from '@/lib/planner/types';

const baseShot: PlannedShot = {
  text: 'Texto original',
  type: 'avatar',
  duration_sec: 4,
  visual_hint_es: 'Plano medio',
  broll_prompt_en: null,
  caption_style: 'pill-karaoke',
};

describe('ShotEditDrawer', () => {
  it('does not render when shot is null', () => {
    const { container } = render(
      <ShotEditDrawer
        shot={null}
        index={0}
        totalShots={3}
        onSave={() => {}}
        onCancel={() => {}}
        onRegenerate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(container.querySelector('[data-testid="shot-edit-drawer"]')).toBeNull();
  });

  it('renders when shot is provided', () => {
    render(
      <ShotEditDrawer
        shot={baseShot}
        index={1}
        totalShots={5}
        onSave={() => {}}
        onCancel={() => {}}
        onRegenerate={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.getByTestId('shot-edit-drawer')).toBeTruthy();
    expect(screen.getByText(/Editar shot/)).toBeTruthy();
  });

  it('Save fires onSave with the patched shot', () => {
    const onSave = vi.fn();
    render(
      <ShotEditDrawer
        shot={baseShot}
        index={0}
        totalShots={1}
        onSave={onSave}
        onCancel={() => {}}
        onRegenerate={() => {}}
        onDelete={() => {}}
      />,
    );
    const textarea = screen.getByTestId('shot-drawer-text') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Texto editado' } });
    fireEvent.click(screen.getByTestId('shot-drawer-save'));
    expect(onSave).toHaveBeenCalledOnce();
    const arg = onSave.mock.calls[0][0] as PlannedShot;
    expect(arg.text).toBe('Texto editado');
  });

  it('Cancel fires onCancel and never calls onSave', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <ShotEditDrawer
        shot={baseShot}
        index={0}
        totalShots={1}
        onSave={onSave}
        onCancel={onCancel}
        onRegenerate={() => {}}
        onDelete={() => {}}
      />,
    );
    const textarea = screen.getByTestId('shot-drawer-text') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Edited but discarded' } });
    fireEvent.click(screen.getByTestId('shot-drawer-cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('ESC key closes the drawer', () => {
    const onCancel = vi.fn();
    render(
      <ShotEditDrawer
        shot={baseShot}
        index={0}
        totalShots={1}
        onSave={() => {}}
        onCancel={onCancel}
        onRegenerate={() => {}}
        onDelete={() => {}}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });
});
