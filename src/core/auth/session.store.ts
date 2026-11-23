import { create } from 'zustand';

import type { Permission } from './permissions';

/**
 * Identidad de la sesión.
 *
 * No se persiste: la identidad **siempre** viene del API (`/auth/user/current`),
 * nunca se decodifica del JWT ni se guarda en disco. Un F5 la recupera
 * renovando el access token.
 */
export interface SessionUser {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  /** Nombres de rol, solo para mostrar; los permisos son la fuente de verdad. */
  readonly roles: readonly string[];
}

export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';

interface SessionState {
  readonly status: SessionStatus;
  readonly user: SessionUser | null;
  readonly permissions: readonly Permission[];
  setSession: (user: SessionUser, permissions: readonly Permission[]) => void;
  setAnonymous: () => void;
  clear: () => void;
}

const initialState = {
  status: 'restoring' as SessionStatus,
  user: null,
  permissions: [] as readonly Permission[]
};

/**
 * Estado global de sesión (capa 3 del estado, ver `docs/02-arquitectura.md` §6).
 *
 * Reglas:
 * - Un solo escritor por campo (`setSession` / `setAnonymous` / `clear`).
 * - Derivados fuera del store: el mapa de permisos se calcula con `useMemo`
 *   porque es una función pura del estado, no un dato que haya que guardar.
 * - `queryClient.clear()` no se llama aquí: lo hace el orquestador de sesión
 *   (`session.service.ts`), que es quien conoce el cliente de consultas.
 */
export const useSessionStore = create<SessionState>()((set) => ({
  ...initialState,

  setSession: (user, permissions) => set({ status: 'authenticated', user, permissions }),

  setAnonymous: () => set({ status: 'anonymous', user: null, permissions: [] }),

  clear: () => set({ status: 'anonymous', user: null, permissions: [] })
}));

/** Solo para pruebas: devuelve el estado inicial (incluido `restoring`). */
export function resetSessionStore(): void {
  useSessionStore.setState({ ...initialState });
}
