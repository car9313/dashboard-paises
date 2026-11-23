import { z } from 'zod';

/** DTO de permiso tal como llega: recurso, descripción y acciones concedidas. */
export const permissionDtoSchema = z.object({
  resource: z.string(),
  description: z.string(),
  actions: z.array(z.string())
});

export const roleDtoSchema = z.object({
  id: z.number(),
  name: z.string(),
  isUnEditable: z.boolean(),
  isUnDeletable: z.boolean(),
  permissions: z.array(permissionDtoSchema)
});

export const rolePageDtoSchema = z.object({
  objects: z.array(roleDtoSchema),
  meta: z.object({
    currentPage: z.number(),
    totalCount: z.number(),
    totalPage: z.number()
  })
});

/** Catálogo de permisos: categorías con sus recursos. */
export const permissionCatalogDtoSchema = z.array(
  z.object({
    category: z.string(),
    permissions: z.array(permissionDtoSchema)
  })
);

export type RoleDto = z.infer<typeof roleDtoSchema>;
export type PermissionCatalogDto = z.infer<typeof permissionCatalogDtoSchema>;
