import type { LucideIcon } from 'lucide-react';

import type { Action } from '@/core/rbac/actions';
import type { Resource } from '@/core/rbac/resources';

export interface NavItem {
  readonly label: string;
  readonly to: string;
  readonly icon: LucideIcon;
  readonly end?: boolean;
  /** Recurso RBAC; sin él, el ítem es público para cualquier sesión. */
  readonly resource?: Resource;
  readonly requiredActions?: readonly Action[];
}

export interface NavGroup {
  readonly label?: string;
  readonly items: readonly NavItem[];
}

/** Predicado de permisos inyectable: en F2 será `useSessionStore.hasPermission`. */
export type PermissionCheck = (resource: Resource, actions: readonly Action[]) => boolean;

/**
 * Filtra el menú por permisos.
 *
 * @remarks
 * Función pura y sin dependencias de React: el filtrado del menú es una regla,
 * no un efecto, y así se prueba sin montar el shell. Es la capa 1 del RBAC
 * (ADR-014).
 */
export function filterNavByPermissions(
  groups: readonly NavGroup[],
  hasPermission: PermissionCheck
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          item.resource === undefined || hasPermission(item.resource, item.requiredActions ?? [])
      )
    }))
    .filter((group) => group.items.length > 0);
}
