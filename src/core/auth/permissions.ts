/**
 * Semántica única de permisos (ADR-014).
 *
 * El backend entrega los permisos dentro de los roles, y varios roles pueden
 * conceder acciones distintas sobre el mismo recurso. La unión es obligatoria:
 * si un rol da `Leer` y otro `Crear`, el usuario tiene ambas.
 *
 * Funciones puras: se prueban sin React y se usan igual en el menú, en los
 * guards de ruta y en los componentes.
 */

export interface Permission {
  readonly resource: string;
  readonly actions: readonly string[];
}

export type PermissionMap = ReadonlyMap<string, ReadonlySet<string>>;

/** Agrupa los permisos por recurso, uniendo las acciones de todos los roles. */
export function buildPermissionMap(permissions: readonly Permission[]): PermissionMap {
  const map = new Map<string, Set<string>>();

  for (const permission of permissions) {
    const granted = map.get(permission.resource);

    if (granted === undefined) {
      map.set(permission.resource, new Set(permission.actions));
      continue;
    }

    for (const action of permission.actions) {
      granted.add(action);
    }
  }

  return map;
}

/**
 * `true` si el mapa concede **todas** las acciones pedidas sobre el recurso.
 *
 * - Sin entrada para el recurso → `false`.
 * - Sin acciones pedidas → basta con tener alguna acción sobre el recurso.
 */
export function hasPermission(
  map: PermissionMap,
  resource: string,
  actions: readonly string[] = []
): boolean {
  const granted = map.get(resource);

  if (granted === undefined) {
    return false;
  }

  if (actions.length === 0) {
    return granted.size > 0;
  }

  return actions.every((action) => granted.has(action));
}
