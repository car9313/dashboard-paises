/**
 * Usuario del módulo de seguridad (ADR-019).
 *
 * @remarks
 * `roles` viene embebido: el listado no lo pinta, pero el detalle y el diálogo lo
 * usan sin un `GET` extra.
 *
 * `isUnEditable` / `isUnDeletable` los calcula el **backend** (el propio usuario
 * de la sesión, el administrador sembrado…). La UI no los infiere: solo
 * deshabilita las acciones correspondientes y deja la fila visible, para no
 * descuadrar el total del servidor.
 */

export interface RoleRef {
  readonly id: number;
  readonly name: string;
}

export interface User {
  readonly id: number;
  readonly username: string;
  readonly fullName: string;
  readonly isUnEditable: boolean;
  readonly isUnDeletable: boolean;
  readonly roles: readonly RoleRef[];
}

/** Metadatos de paginación que devuelve el backend. */
export interface PageMeta {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly totalCount: number;
}

export interface UserPage {
  readonly users: readonly User[];
  readonly meta: PageMeta;
}

/** Datos del alta. La contraseña es obligatoria y viaja con su confirmación. */
export interface CreateUserInput {
  readonly username: string;
  readonly fullName: string;
  readonly password: string;
  readonly passwordConfirmation: string;
  readonly roleIds: readonly number[];
}

/** Datos de la edición: `username` no se edita y la contraseña es opcional. */
export interface UpdateUserInput {
  readonly id: number;
  readonly fullName: string;
  readonly password: string;
  readonly passwordConfirmation: string;
  readonly roleIds: readonly number[];
}

/** Roles asignados como texto, para la columna de la tabla. */
export function formatRoles(user: User): string {
  return user.roles.map((role) => role.name).join(', ');
}
