import { useMemo } from 'react';

import type { Action } from '@/core/rbac/actions';
import type { Resource } from '@/core/rbac/resources';

import { buildPermissionMap, hasPermission, type PermissionMap } from './permissions';
import { useSessionStore } from './session.store';

/**
 * Mapa de permisos derivado del estado de sesión.
 *
 * Es un `useMemo` sobre un dato puro: no se guarda en el store porque sería un
 * segundo escritor del mismo hecho (regla de `AGENTS.md`).
 */
export function usePermissionMap(): PermissionMap {
  const permissions = useSessionStore((state) => state.permissions);

  return useMemo(() => buildPermissionMap(permissions), [permissions]);
}

/** `true` si la sesión concede todas las acciones pedidas sobre el recurso. */
export function useHasPermission(resource: Resource, actions: readonly Action[] = []): boolean {
  const map = usePermissionMap();
  return hasPermission(map, resource, actions);
}

/** `true` si hay identidad cargada. */
export function useIsAuthenticated(): boolean {
  const status = useSessionStore((state) => state.status);
  return status === 'authenticated';
}
