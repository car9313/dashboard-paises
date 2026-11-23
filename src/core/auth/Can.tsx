import type { ReactNode } from 'react';

import type { Action } from '@/core/rbac/actions';
import type { Resource } from '@/core/rbac/resources';

import { useHasPermission } from './use-permission';

export interface CanProps {
  readonly resource: Resource;
  /** Acciones que deben estar concedidas. Vacío = cualquier acción del recurso. */
  readonly actions?: readonly Action[];
  /** Qué renderizar si no hay permiso. Por defecto, nada. */
  readonly fallback?: ReactNode;
  readonly children: ReactNode;
}

/**
 * Capa 3 del RBAC: oculta o sustituye UI según permisos (ADR-014).
 *
 * @remarks
 * Ocultar un botón **no** es seguridad; es coherencia. El backend sigue siendo
 * la autoridad y la ruta ya está protegida por `requirePermission`. Se usa para
 * no ofrecer acciones que van a fallar con 403.
 *
 * @example
 * ```tsx
 * <Can resource={RESOURCES.Nomenclators} actions={[ACTIONS.Create]}>
 *   <Button onClick={openCreate}>Nuevo país</Button>
 * </Can>
 * ```
 */
export function Can({ resource, actions = [], fallback = null, children }: CanProps) {
  const allowed = useHasPermission(resource, actions);

  return <>{allowed ? children : fallback}</>;
}
