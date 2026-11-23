import { z } from 'zod';

/**
 * Esquema de alta/edición de país.
 *
 * - `code`: dos letras ISO-3166-1 alpha-2 (se normaliza a mayúsculas al enviar).
 * - `name`: 2–80 caracteres; el backend acepta más, pero un nombre de país no
 *   necesita más y una tabla con textos eternos deja de ser legible.
 *
 * El mensaje vive en el esquema: formulario y pruebas comparten el texto.
 */
export const countryInputSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'El código debe tener exactamente 2 letras'),
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(80, 'El nombre no puede superar los 80 caracteres')
});

export type CountryInputValues = z.infer<typeof countryInputSchema>;

/** En edición el `code` no se puede cambiar: solo se valida el nombre. */
export const countryUpdateSchema = countryInputSchema.pick({ name: true });

export type CountryUpdateValues = z.infer<typeof countryUpdateSchema>;
