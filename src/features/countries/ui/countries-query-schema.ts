import { z } from 'zod';

/**
 * Forma del estado de la vista de países y sus dos lectores.
 *
 * Vive aparte del hook para que la persistencia (`country-filters-storage.ts`)
 * y la URL compartan el mismo esquema sin importarse entre sí.
 *
 * @remarks
 * Hay **dos** validaciones a propósito:
 * - `urlQueryStateSchema` **corrige** (`catch`): una URL editada a mano nunca
 *   deja la tabla en blanco.
 * - `countriesQueryStateSchema` **rechaza**: si el payload guardado no encaja
 *   entero, se descarta; restaurar medio filtro es peor que no restaurarlo.
 */

export const COUNTRIES_DEFAULT_PAGE_SIZE = 10;
export const COUNTRIES_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export const MAX_QUERY_LENGTH = 80;

const pageSizeSchema = z.coerce
  .number()
  .int()
  .refine((value) => (COUNTRIES_PAGE_SIZE_OPTIONS as readonly number[]).includes(value), {
    message: 'Tamaño de página no permitido'
  });

const shape = {
  q: z.string().max(MAX_QUERY_LENGTH),
  status: z.enum(['all', 'active', 'inactive']),
  sort: z.enum(['name', 'code']),
  dir: z.enum(['asc', 'desc']),
  page: z.coerce.number().int().min(1),
  size: pageSizeSchema
};

/** Estricto: se usa para restaurar y para tipar el estado. */
export const countriesQueryStateSchema = z.object(shape);

/** Tolerante: se usa con la URL (cada campo cae a su valor por defecto). */
export const urlQueryStateSchema = z.object({
  q: shape.q.catch(''),
  status: shape.status.catch('all'),
  sort: shape.sort.catch('name'),
  dir: shape.dir.catch('asc'),
  page: shape.page.catch(1),
  size: shape.size.catch(COUNTRIES_DEFAULT_PAGE_SIZE)
});

export type CountriesQueryState = z.infer<typeof countriesQueryStateSchema>;

/** Serializa solo lo que difiere de los valores por defecto. */
export function toSearchParams(state: CountriesQueryState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.q.length > 0) params.set('q', state.q);
  if (state.status !== 'all') params.set('status', state.status);
  if (state.sort !== 'name') params.set('sort', state.sort);
  if (state.dir !== 'asc') params.set('dir', state.dir);
  if (state.page !== 1) params.set('page', String(state.page));
  if (state.size !== COUNTRIES_DEFAULT_PAGE_SIZE) params.set('size', String(state.size));

  return params;
}

/** `true` si el estado no aporta nada sobre la vista por defecto. */
export function isDefaultQueryState(state: CountriesQueryState): boolean {
  return toSearchParams(state).toString() === '';
}
