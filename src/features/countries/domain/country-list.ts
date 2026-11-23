import { includesNormalized } from '@/shared/lib/normalize';

import type { Country } from './country';

/** Filtro por estado: «all» no filtra. */
export type CountryStatus = 'all' | 'active' | 'inactive';

export type CountrySortKey = 'name' | 'code';

export type SortDirection = 'asc' | 'desc';

export interface CountryFilters {
  readonly query: string;
  readonly status: CountryStatus;
}

export const COUNTRY_STATUS_LABEL: Record<CountryStatus, string> = {
  all: 'Todos',
  active: 'Activos',
  inactive: 'Inactivos'
};

/**
 * Coincidencia de la búsqueda de cliente.
 *
 * @remarks
 * La búsqueda del backend devuelve 500 (ADR-013), así que se hace aquí sobre el
 * catálogo completo. Se comparan **nombre y código**: buscar «cu» debe encontrar
 * Cuba tanto por nombre como por código.
 */
function matchesQuery(country: Country, query: string): boolean {
  return includesNormalized(country.name, query) || includesNormalized(country.code, query);
}

function matchesStatus(country: Country, status: CountryStatus): boolean {
  if (status === 'all') {
    return true;
  }

  return status === 'active' ? country.active : !country.active;
}

/** Filtra por búsqueda y estado. Sin filtros devuelve la misma referencia. */
export function filterCountries(
  countries: readonly Country[],
  filters: CountryFilters
): readonly Country[] {
  const query = filters.query.trim();

  if (query.length === 0 && filters.status === 'all') {
    return countries;
  }

  return countries.filter(
    (country) => matchesQuery(country, query) && matchesStatus(country, filters.status)
  );
}

/**
 * Ordena por nombre o código.
 *
 * @remarks
 * Se usa `localeCompare` con la configuración española y `sensitivity: 'base'`
 * para que «Ávila» caiga donde el usuario espera y no después de la «Z».
 * El desempate por código evita que dos nombres iguales cambien de orden entre
 * renders.
 */
export function sortCountries(
  countries: readonly Country[],
  key: CountrySortKey,
  direction: SortDirection
): readonly Country[] {
  const factor = direction === 'asc' ? 1 : -1;

  return [...countries].sort((left, right) => {
    const primary = left[key].localeCompare(right[key], 'es', { sensitivity: 'base' });
    const tieBreaker = left.code.localeCompare(right.code, 'es', { sensitivity: 'base' });

    return (primary !== 0 ? primary : tieBreaker) * factor;
  });
}
