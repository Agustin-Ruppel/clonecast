import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ShotEditor from '@/components/ShotEditor';
import type { Shot } from '@/lib/types';

function makeShot(overrides: Partial<Shot> = {}): Shot {
  return {
    type: 'speak',
    text: 'Hola mundo',
    broll: {
      prompt: 'A laptop on a desk',
      model: 'higgsfield',
      duration: 4,
      use_character_ref: true,
    },
    caption_style: 'pill-karaoke',
    ...overrides,
  };
}

describe('ShotEditor', () => {
  it('renders the shot index and current text', () => {
    const shot = makeShot();
    render(
      <ShotEditor shot={shot} index={0} onChange={vi.fn()} onDelete={vi.fn()} onDuplicate={vi.fn()} />,
    );
    expect(screen.getByText('Shot 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Shot text')).toHaveValue('Hola mundo');
  });

  it('calls onChange with a new model when a model pill is clicked', () => {
    const shot = makeShot();
    const onChange = vi.fn();
    render(
      <ShotEditor shot={shot} index={0} onChange={onChange} onDelete={vi.fn()} onDuplicate={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Model Kling' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Shot;
    expect(next.broll?.model).toBe('kling');
  });

  it('calls onChange with a new duration when the slider changes', () => {
    const shot = makeShot();
    const onChange = vi.fn();
    render(
      <ShotEditor shot={shot} index={0} onChange={onChange} onDelete={vi.fn()} onDuplicate={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '7' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Shot;
    expect(next.broll?.duration).toBe(7);
  });

  it('propagates text changes', () => {
    const shot = makeShot();
    const onChange = vi.fn();
    render(
      <ShotEditor shot={shot} index={0} onChange={onChange} onDelete={vi.fn()} onDuplicate={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText('Shot text'), { target: { value: 'Nuevo texto' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Shot;
    expect(next.text).toBe('Nuevo texto');
  });

  it('propagates B-roll prompt changes', () => {
    const shot = makeShot();
    const onChange = vi.fn();
    render(
      <ShotEditor shot={shot} index={0} onChange={onChange} onDelete={vi.fn()} onDuplicate={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText('B-roll prompt'), {
      target: { value: 'Sunset over mountains' },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as Shot;
    expect(next.broll?.prompt).toBe('Sunset over mountains');
  });

  it('calls onDelete when the delete button is clicked', () => {
    const onDelete = vi.fn();
    render(
      <ShotEditor
        shot={makeShot()}
        index={0}
        onChange={vi.fn()}
        onDelete={onDelete}
        onDuplicate={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Delete shot'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onDuplicate when the duplicate button is clicked', () => {
    const onDuplicate = vi.fn();
    render(
      <ShotEditor
        shot={makeShot()}
        index={0}
        onChange={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={onDuplicate}
      />,
    );
    fireEvent.click(screen.getByLabelText('Duplicate shot'));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });
});
