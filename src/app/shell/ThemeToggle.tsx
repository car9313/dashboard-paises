import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';

import { applyTheme, resolveTheme, type ThemeMode, useThemeStore } from '@/core/ui/theme.store';
import { Button } from '@/shared/ui/button';

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: 'light',
  light: 'dark',
  dark: 'system'
};

const MODE_LABEL: Record<ThemeMode, string> = {
  system: 'Tema del sistema',
  light: 'Tema claro',
  dark: 'Tema oscuro'
};

const MODE_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

/**
 * Conmutador de tema (claro → oscuro → sistema).
 *
 * @remarks
 * El cambio de clase en `<html>` es un efecto secundario del DOM, no estado
 * derivado: por eso vive en `useEffect` y no en un `useState` espejo.
 */
export function ThemeToggle() {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  useEffect(() => {
    applyTheme(mode);

    if (mode !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, [mode]);

  const Icon = MODE_ICON[mode];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setMode(NEXT_MODE[mode])}
      aria-label={`${MODE_LABEL[mode]}. Cambiar tema`}
      title={`${MODE_LABEL[mode]} (${resolveTheme(mode)})`}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
