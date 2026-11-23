import { z } from 'zod';

/**
 * Esquemas de alta y edición de usuarios.
 *
 * @remarks
 * La política de contraseña replica la del proyecto origen (mínimo 8, mayúscula,
 * minúscula, dígito y símbolo). Vive aquí, junto al dominio, para que el mensaje
 * que ve el usuario sea el mismo que se prueba.
 */

const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[a-z]/, 'Debe incluir al menos una minúscula')
  .regex(/\d/, 'Debe incluir al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir al menos un símbolo');

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'El usuario debe tener al menos 3 caracteres')
  .max(40, 'El usuario no puede pasar de 40 caracteres')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo');

const fullNameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(120, 'El nombre no puede pasar de 120 caracteres');

/*
 * Las casillas devuelven strings ("2"): el esquema acepta ambos y normaliza a
 * número en la salida. Sin esto el formulario nunca pasa de la validación y
 * parece que no envía nada.
 */
const roleIdSchema = z
  .union([z.number().int().positive(), z.string().regex(/^\d+$/, 'Rol inválido')])
  .transform((value) => Number(value));

const roleIdsSchema = z
  .array(roleIdSchema)
  .min(1, 'Asigna al menos un rol')
  .refine((ids) => new Set(ids).size === ids.length, { message: 'Hay roles repetidos' });

export const createUserSchema = z
  .object({
    username: usernameSchema,
    fullName: fullNameSchema,
    password: passwordSchema,
    passwordConfirmation: z.string().min(1, 'Confirma la contraseña'),
    roleIds: roleIdsSchema
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'Las contraseñas no coinciden'
  });

export const updateUserSchema = z
  .object({
    fullName: fullNameSchema,
    password: z.string(),
    passwordConfirmation: z.string(),
    roleIds: roleIdsSchema
  })
  .superRefine((values, context) => {
    // En edición la contraseña es opcional: vacía significa «no cambiarla».
    if (values.password.length === 0) {
      if (values.passwordConfirmation.length > 0) {
        context.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'Escribe la contraseña para cambiarla'
        });
      }
      return;
    }

    const strength = passwordSchema.safeParse(values.password);

    if (!strength.success) {
      for (const issue of strength.error.issues) {
        context.addIssue({ code: 'custom', path: ['password'], message: issue.message });
      }
      return;
    }

    if (values.password !== values.passwordConfirmation) {
      context.addIssue({
        code: 'custom',
        path: ['passwordConfirmation'],
        message: 'Las contraseñas no coinciden'
      });
    }
  });

/** Lo que el formulario guarda (los checks llegan como string). */
export type CreateUserValues = z.input<typeof createUserSchema>;
export type UpdateUserValues = z.input<typeof updateUserSchema>;

/** Lo que se envía al API ya normalizado. */
export type CreateUserSubmit = z.output<typeof createUserSchema>;
export type UpdateUserSubmit = z.output<typeof updateUserSchema>;
