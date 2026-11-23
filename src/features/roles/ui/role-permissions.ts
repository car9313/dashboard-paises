import type { ActionCommand, PermissionCategory } from '../domain/role';

/**
 * Lógica pura de la matriz de permisos.
 *
 * @remarks
 * El backend guarda los permisos **planos** (`{ resource, actionType }[]`) pero
 * los devuelve agrupados por categoría. Toda la conversión vive aquí, fuera de
 * React, para poder probar el ida y vuelta sin montar un diálogo.
 */

/** Clave estable de una casilla: `<recurso>:<acción>`. */
export function permissionKey(resource: string, action: string): string {
  return `${resource}:${action}`;
}

/** Marca las casillas que ya tiene el rol. */
export function toSelectedKeys(categories: readonly PermissionCategory[]): ReadonlySet<string> {
  const keys = new Set<string>();

  for (const category of categories) {
    for (const permission of category.permissions) {
      for (const action of permission.actions) {
        keys.add(permissionKey(permission.resource, action));
      }
    }
  }

  return keys;
}

/**
 * Aplana la selección al payload del API.
 *
 * El recurso se corta en el **primer** `:`, así que un recurso con dos puntos en
 * el nombre seguiría funcionando; una acción con `:` no, y no existe en este
 * backend.
 */
export function toActionCommands(keys: ReadonlySet<string>): readonly ActionCommand[] {
  const commands: ActionCommand[] = [];

  for (const key of keys) {
    const separator = key.indexOf(':');

    if (separator <= 0) {
      continue;
    }

    commands.push({
      resource: key.slice(0, separator),
      actionType: key.slice(separator + 1)
    });
  }

  return commands;
}

/** `true` si el usuario tocó la matriz respecto a lo que había. */
export function hasChanges(initial: ReadonlySet<string>, current: ReadonlySet<string>): boolean {
  if (initial.size !== current.size) {
    return true;
  }

  for (const key of current) {
    if (!initial.has(key)) {
      return true;
    }
  }

  return false;
}

/**
 * Acciones que el catálogo ofrece para un recurso.
 *
 * La matriz no inventa columnas: si un recurso solo admite `Leer`, solo aparece
 * esa casilla.
 */
export function actionsOf(categories: readonly PermissionCategory[], resource: string): string[] {
  for (const category of categories) {
    const match = category.permissions.find((permission) => permission.resource === resource);

    if (match !== undefined) {
      return [...match.actions];
    }
  }

  return [];
}

/** Todas las acciones distintas del catálogo, en orden de aparición. */
export function allActions(categories: readonly PermissionCategory[]): string[] {
  const actions = new Set<string>();

  for (const category of categories) {
    for (const permission of category.permissions) {
      for (const action of permission.actions) {
        actions.add(action);
      }
    }
  }

  return [...actions];
}
