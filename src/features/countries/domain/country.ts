/**
 * País del nomenclador tal como lo consume la UI.
 *
 * `code` es la clave natural: identifica el país en la URL del backend
 * (`/api/country/{code}`) y es el `rowId` de la tabla. No se inventa un `id`.
 */
export interface Country {
  readonly code: string;
  readonly name: string;
  readonly active: boolean;
}

/**
 * Campos que el usuario captura al crear o editar.
 *
 * No incluye `active`: el estado no viaja en el payload de escritura, se cambia
 * con los endpoints `activate` / `DELETE` (borrado lógico). Es una regla del
 * contrato del backend, no una preferencia de la UI.
 */
export interface CountryInput {
  readonly code: string;
  readonly name: string;
}

/**
 * Catálogo completo en memoria (lo que devuelve `/api/country/all`).
 *
 * Es la unidad de caché de TanStack Query: una sola entrada para toda la
 * pantalla (ADR-013).
 */
export interface CountryCatalog {
  readonly countries: readonly Country[];
  readonly totalCount: number;
}

/**
 * Aplica un cambio de estado a una fila del catálogo.
 *
 * Función pura y aislada a propósito: es el corazón del update optimista, y así
 * se prueba sin montar React ni simular red. Devuelve un catálogo nuevo; nunca
 * muta el anterior (TanStack Query compara referencias).
 */
export function patchCountryActive(
  catalog: CountryCatalog,
  code: string,
  active: boolean
): CountryCatalog {
  return {
    ...catalog,
    countries: catalog.countries.map((country) =>
      country.code === code ? { ...country, active } : country
    )
  };
}

/** Sustituye una fila completa (tras editar su nombre). */
export function patchCountry(catalog: CountryCatalog, updated: Country): CountryCatalog {
  return {
    ...catalog,
    countries: catalog.countries.map((country) =>
      country.code === updated.code ? updated : country
    )
  };
}
