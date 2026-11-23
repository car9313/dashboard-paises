/**
 * Rol del sistema (ADR-019).
 *
 * `permissions` son los permisos **asignados** al rol, con la forma plana del
 * backend: un recurso, una descripción y las acciones concedidas.
 */
export interface Permission {
  readonly resource: string;
  readonly description: string;
  readonly actions: readonly string[];
}

export interface Role {
  readonly id: number;
  readonly name: string;
  readonly isUnEditable: boolean;
  readonly isUnDeletable: boolean;
  readonly permissions: readonly Permission[];
}

/** Referencia mínima (la que llevan embebida los usuarios). */
export interface RoleRef {
  readonly id: number;
  readonly name: string;
}

/** Categoría del catálogo de permisos (`GET /api/roles/permissions`). */
export interface PermissionCategory {
  readonly category: string;
  readonly permissions: readonly Permission[];
}

/** Acción a guardar en `PUT /api/roles/{id}/permissions`. */
export interface ActionCommand {
  readonly resource: string;
  readonly actionType: string;
}

/** Payload paginado del listado de roles. */
export interface RolePage {
  readonly roles: readonly Role[];
  readonly totalCount: number;
}
