import { describe, expect, it, vi } from 'vitest';

import { applyTheme, resolveTheme, useThemeStore } from './theme.store';

describe('applyTheme', () => {
  it('cambia la clase dark y activa la transición de colores', () => {
    vi.useFakeTimers();
    const root = document.documentElement;
    useThemeStore.setState({ mode: 'dark' });

    applyTheme('dark');

    expect(root.classList.contains('dark')).toBe(true);
    expect(root.classList.contains('theme-transition')).toBe(true);
    expect(root.style.colorScheme).toBe('dark');
  });

  it('retira la clase de transición al terminar, para no animar siempre', () => {
    vi.useFakeTimers();
    const root = document.documentElement;

    applyTheme('light');

    expect(root.classList.contains('theme-transition')).toBe(true);

    vi.advanceTimersByTime(400);

    expect(root.classList.contains('theme-transition')).toBe(false);
    expect(root.classList.contains('dark')).toBe(false);

    vi.useRealTimers();
  });

  it('aplica solo un temporizador aunque se cambie de tema varias veces', () => {
    vi.useFakeTimers();
    const root = document.documentElement;

    applyTheme('dark');
    applyTheme('light');
    applyTheme('dark');

    vi.advanceTimersByTime(400);

    expect(root.classList.contains('theme-transition')).toBe(false);
    expect(root.classList.contains('dark')).toBe(true);

    vi.useRealTimers();
  });
});

describe('resolveTheme', () => {
  it('respeta el modo explícito', () => {
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });

  it('resuelve system con la preferencia del sistema', () => {
    const original = window.matchMedia;

    window.matchMedia = ((query: string) => ({
      matches: query.includes('dark'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false
    })) as typeof window.matchMedia;

    expect(resolveTheme('system')).toBe('dark');

    window.matchMedia = original;
  });
});
