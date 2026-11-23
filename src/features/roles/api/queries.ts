import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/core/query/keys';

import type { Role } from '../domain/role';
import { rolesRepository } from './repositories';

/**
 * Catálogo de roles para selectores y para el editor de permisos.
 *
 * @remarks
 * Se cachea 5 minutos: cambia poco y lo consumen dos pantallas (usuarios y
 * roles). La feature `users` accede a este hook por su superficie pública
 * `@/features/roles` (ADR-020).
 */
export function useRolesCatalog() {
  return useQuery<readonly Role[]>({
    queryKey: queryKeys.roles.catalog(),
    queryFn: ({ signal }) => rolesRepository.listAll(signal),
    staleTime: 5 * 60 * 1000
  });
}

/** Catálogo de permisos agrupado por categoría (`GET /api/roles/permissions`). */
export function usePermissionsCatalog() {
  return useQuery({
    queryKey: queryKeys.roles.permissionsCatalog(),
    queryFn: ({ signal }) => rolesRepository.getPermissionsCatalog(signal),
    staleTime: 10 * 60 * 1000
  });
}
/** Permisos asignados a un rol, ya agrupados por categoría. */
export function useRolePermissions(roleId: number) {
  return useQuery({
    queryKey: queryKeys.roles.permissions(roleId),
    queryFn: ({ signal }) => rolesRepository.getPermissionsByRole(roleId, signal),
    staleTime: 30 * 1000
  });
}
