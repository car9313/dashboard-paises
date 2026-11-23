import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  readonly mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const THEME_STORAGE_KEY = 'dashboard-theme';

/**
 * Preferencia de tema.
 *
 * @remarks
 * La clave y el shape deben coincidir con el script de `index.html` que aplica
 * la clase `dark` antes del primer paint (evita el destello claro→oscuro).
 * El DOM es la fuente de verdad del color; este store solo guarda la intención.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      setMode: (mode) => set({ mode })
    }),
    { name: THEME_STORAGE_KEY }
  )
);

/** Resuelve `system` contra la preferencia del sistema operativo. */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode !== 'system') {
    return mode;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Duración de la transición de colores al cambiar de tema (debe cubrir `--duration-slow`). */
const THEME_TRANSITION_MS = 300;

let transitionTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Aplica el tema al documento.
 *
 * @remarks
 * Se llama desde un efecto de `ThemeSync` (efecto secundario sobre el DOM, uso
 * legítimo de `useEffect`) y desde el listener de `matchMedia`.
 *
 * El cambio de colores se anima con la clase `theme-transition`, que se retira
 * al terminar: mantener transiciones de color permanentes en todo el árbol es
 * caro y no aporta nada mientras el usuario navega. Con `prefers-reduced-motion`
 * el CSS global ya deja la duración en casi cero.
 */
export function applyTheme(mode: ThemeMode): void {
  const resolved = resolveTheme(mode);

  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;

  root.classList.add('theme-transition');
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;

  if (transitionTimer !== null) {
    clearTimeout(transitionTimer);
  }

  transitionTimer = setTimeout(() => {
    root.classList.remove('theme-transition');
    transitionTimer = null;
  }, THEME_TRANSITION_MS);
}
