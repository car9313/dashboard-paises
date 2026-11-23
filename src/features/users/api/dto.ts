import { z } from 'zod';

/**
 * DTO de usuario tal como llega del wire (`PascalCase` en el backend).
 *
 * `roles` llega a veces como `RoleDto` completo; aquí solo se exige lo que la UI
 * usa y Zod descarta el resto, así que un enriquecimiento del backend no rompe.
 */
export const roleRefDtoSchema = z.object({
  id: z.number(),
  name: z.string()
});

export const userDtoSchema = z.object({
  id: z.number(),
  username: z.string(),
  fullName: z.string(),
  isUnEditable: z.boolean(),
  isUnDeletable: z.boolean(),
  roles: z.array(roleRefDtoSchema)
});

export const userPageDtoSchema = z.object({
  objects: z.array(userDtoSchema),
  meta: z.object({
    currentPage: z.number(),
    totalCount: z.number(),
    totalPage: z.number()
  })
});

/** `reset-password` devuelve la clave temporal, pero el cuerpo no está verificado. */
export const resetPasswordResponseSchema = z.object({
  password: z.string().optional()
});

export type UserDto = z.infer<typeof userDtoSchema>;
export type UserPageDto = z.infer<typeof userPageDtoSchema>;
