import { z } from 'zod';

/**
 * Contrato del wire para `/api/country`.
 *
 * `isUnitedState` llega del backend (es una propiedad calculada) pero el dominio
 * no la expone: no tiene consumidor en la UI y permitiría que la vista dependa
 * de una regla que vive en la base de datos. El esquema de Zod la descarta.
 */

const countryDtoSchema = z.object({
  code: z.string().min(1),
  name: z.string(),
  active: z.boolean()
});

const pageMetaSchema = z.object({
  currentPage: z.number(),
  nextPage: z.number().nullable(),
  prevPage: z.number().nullable(),
  totalPage: z.number(),
  totalCount: z.number()
});

/** Respuesta de `GET /api/country/all`. */
export const countryPageDtoSchema = z.object({
  objects: z.array(countryDtoSchema),
  meta: pageMetaSchema
});

export type CountryDto = z.infer<typeof countryDtoSchema>;
export type CountryPageDto = z.infer<typeof countryPageDtoSchema>;

/** Payload de alta. En edición el backend solo acepta `name`. */
export interface CountryWriteDto {
  readonly code: string;
  readonly name: string;
}

export interface CountryUpdateDto {
  readonly name: string;
}
