import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { env } from '@/core/config/env';

import type { MotionMode } from './motion';

interface UiState {
  readonly sidebarCollapsed: boolean;
  readonly mobileNavOpen: boolean;
  /** Cómo se muestran los permisos de un rol: tabla o árbol (ADR-019). */
  readonly permissionsView: 'table' | 'tree';
  /** Preferencia de animaciones (ver motion.ts). */
  readonly motion: MotionMode;
  toggleSidebar: () => void;
  setMobileNavOpen: (open: boolean) => void;
  setPermissionsView: (view: 'table' | 'tree') => void;
  setMotion: (motion: MotionMode) => void;
}

export const UI_STORAGE_KEY = 'dashboard-ui';

/**
 * Almacenamiento inerte para las pruebas.
 *
 * @remarks
 * En Vitest hay dos problemas con `localStorage` real: el middleware `persist`
 * escribe en cada `setState` y jsdom emite eventos que realimentan el ciclo,
 * colgando la suite (visto el 2026-11-23: decenas de tests pasaban aislados y
 * se bloqueaban en conjunto). Con un almacenamiento no-op el estado del store
 * sigue funcionando en memoria y nadie toca el disco.
 */
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined
};

/**
 * Estado de interfaz del shell (no de negocio).
 *
 * El colapso del sidebar y la vista de permisos son preferencias del usuario y
 * sobreviven recargas; el drawer móvil es efímero y se excluye con `partialize`.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      permissionsView: 'table',
      motion: 'system',
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setPermissionsView: (view) => set({ permissionsView: view }),
      setMotion: (motion) => set({ motion })
    }),
    {
      name: UI_STORAGE_KEY,
      storage: createJSONStorage(() => (env.isTest ? noopStorage : localStorage)),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        // La vista de permisos es preferencia del usuario: sobrevive recargas.
        permissionsView: state.permissionsView,
        motion: state.motion
      })
    }
  )
);
