/**
 * Fábrica única de claves de consulta.
 *
 * Una clave escrita a mano en un componente es un bug esperando: la
 * invalidación deja de coincidir y la tabla muestra datos viejos sin avisar.
 */
export const queryKeys = {
  countries: {
    all: ['countries'] as const,
    catalog: () => [...queryKeys.countries.all, 'catalog'] as const,
    detail: (code: string) => [...queryKeys.countries.all, 'detail', code] as const
  },
  users: {
    all: ['users'] as const,
    list: (page: number, pageSize: number) =>
      [...queryKeys.users.all, 'list', page, pageSize] as const,
    detail: (id: number) => [...queryKeys.users.all, 'detail', id] as const
  },
  roles: {
    all: ['roles'] as const,
    list: (page: number, pageSize: number) =>
      [...queryKeys.roles.all, 'list', page, pageSize] as const,
    catalog: () => [...queryKeys.roles.all, 'catalog'] as const,
    permissionsCatalog: () => [...queryKeys.roles.all, 'permissions-catalog'] as const,
    permissions: (roleId: number) => [...queryKeys.roles.all, 'permissions', roleId] as const
  },
  auth: {
    all: ['auth'] as const,
    currentUser: () => [...queryKeys.auth.all, 'current-user'] as const
  }
} as const;
