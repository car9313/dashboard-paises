/**
 * Recursos protegidos por RBAC.
 *
 * Los valores son los que el backend devuelve en `permissions[].resource`;
 * las claves son el nombre que usa el código. Un literal suelto en un
 * componente no compila contra este tipo.
 *
 * @remarks
 * `Role` y `User` van en **singular** a propósito: así los declara el backend
 * (ADR-019). Escribir `Roles` produce un 403 que no dice por qué.
 */
export const RESOURCES = {
  Nomenclators: 'Nomenclators',
  Role: 'Role',
  User: 'User'
} as const;

export type Resource = (typeof RESOURCES)[keyof typeof RESOURCES];
