import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Surface } from '@/components/ui/Surface';
import { ActionTile } from '@/components/ui/ActionTile';
import { ListRow } from '@/components/ui/ListRow';
import { Field } from '@/components/ui/Field';
import { Toolbar } from '@/components/ui/Toolbar';

describe('design-system archetypes', () => {
  it('Surface renders children', () => {
    render(<Surface>hello-surface</Surface>);
    expect(screen.getByText('hello-surface')).toBeTruthy();
  });

  it('ActionTile renders a button when no href', () => {
    const onClick = vi.fn();
    render(
      <ActionTile onClick={onClick} selected>
        tile-button
      </ActionTile>,
    );
    expect(screen.getByRole('button', { name: /tile-button/i })).toBeTruthy();
  });

  it('ActionTile renders a link when href is set', () => {
    render(<ActionTile href="/foo">tile-link</ActionTile>);
    const link = screen.getByRole('link', { name: /tile-link/i }) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/foo');
  });

  it('ListRow renders children', () => {
    render(<ListRow expanded>row-content</ListRow>);
    expect(screen.getByText('row-content')).toBeTruthy();
  });

  it('Field renders label, hint and children', () => {
    render(
      <Field label="Name" hint="your full name">
        <input data-testid="inner-input" />
      </Field>,
    );
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('your full name')).toBeTruthy();
    expect(screen.getByTestId('inner-input')).toBeTruthy();
  });

  it('Field shows error and hides hint when error provided', () => {
    render(
      <Field label="Email" hint="ignored" error="bad email">
        <input />
      </Field>,
    );
    expect(screen.getByText('bad email')).toBeTruthy();
    expect(screen.queryByText('ignored')).toBeNull();
  });

  it('Toolbar renders children', () => {
    render(
      <Toolbar>
        <span>tb-item</span>
      </Toolbar>,
    );
    expect(screen.getByText('tb-item')).toBeTruthy();
  });
});
