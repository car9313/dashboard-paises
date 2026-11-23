import { permissionKey } from './role-permissions';
import type { PermissionCategory } from '../domain/role';

/**
 * Modelo del árbol de permisos: **categoría → recurso → acción**.
 *
 * Replica el `p-tree` del proyecto origen, que marcaba con `propagateSelectionUp`
 * y `propagateSelectionDown`. Aquí la propagación se resuelve con conjuntos de
 * claves: marcar un padre añade todas sus hojas; el estado del padre se **deriva**
 * de sus hijas, así que un recurso a medias queda «indeterminado» sin estado extra.
 *
 * Lo que se guarda sigue siendo la hoja (`{ resource, actionType }`): los nodos
 * intermedios solo existen en la UI.
 */

export interface TreeActionNode {
  readonly kind: 'action';
  readonly key: string;
  readonly resource: string;
  readonly action: string;
}

export interface TreeResourceNode {
  readonly kind: 'resource';
  readonly resource: string;
  readonly description: string;
  readonly actions: readonly TreeActionNode[];
}

export interface TreeCategoryNode {
  readonly kind: 'category';
  readonly category: string;
  readonly resources: readonly TreeResourceNode[];
}

/** Estado visual de una casilla. */
export type CheckState = 'checked' | 'indeterminate' | 'unchecked';

interface PermissionLike {
  readonly resource: string;
  readonly description: string;
  readonly actions: readonly string[];
}

/**
 * Construye el árbol. `categoryPermissions` decide **qué hojas existen** y
 * `assigned` cuáles están marcadas, igual que en la vista de tabla.
 */
export function buildTree(
  categories: readonly PermissionCategory[],
  categoryPermissions: readonly PermissionCategory[] = categories
): readonly TreeCategoryNode[] {
  return categories.map((category) => {
    const available = categoryPermissions.find((entry) => entry.category === category.category);

    return {
      kind: 'category',
      category: category.category,
      resources: (available?.permissions ?? category.permissions).map(
        (permission: PermissionLike) => ({
          kind: 'resource',
          resource: permission.resource,
          description: permission.description,
          actions: permission.actions.map((action) => ({
            kind: 'action',
            key: permissionKey(permission.resource, action),
            resource: permission.resource,
            action
          }))
        })
      )
    };
  });
}

/** Estado de un grupo a partir de sus hojas. */
export function stateOf(selected: ReadonlySet<string>, keys: readonly string[]): CheckState {
  if (keys.length === 0) {
    return 'unchecked';
  }

  let granted = 0;

  for (const key of keys) {
    if (selected.has(key)) granted += 1;
  }

  if (granted === 0) return 'unchecked';
  return granted === keys.length ? 'checked' : 'indeterminate';
}

/** Claves de todas las acciones de un recurso. */
export function keysOfResource(node: TreeResourceNode): readonly string[] {
  return node.actions.map((action) => action.key);
}

/** Claves de todas las acciones de una categoría. */
export function keysOfCategory(node: TreeCategoryNode): readonly string[] {
  return node.resources.flatMap(keysOfResource);
}

/**
 * Aplica un cambio propagado: marcar un grupo añade todas sus hojas, desmarcarlo
 * las quita. Devuelve un conjunto nuevo (no muta el recibido).
 */
export function applyGroup(
  selected: ReadonlySet<string>,
  keys: readonly string[],
  checked: boolean
): ReadonlySet<string> {
  const next = new Set(selected);

  for (const key of keys) {
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
  }

  return next;
}
