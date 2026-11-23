import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/core/query/keys';

import { countriesRepository } from './repositories';

/** Frescura del catálogo: 5 min (ADR-004). El nomenclador cambia poco. */
const CATALOG_STALE_TIME = 5 * 60_000;
const CATALOG_GC_TIME = 30 * 60_000;

/**
 * Catálogo de países.
 *
 * Una sola petición por sesión de trabajo: la tabla, la búsqueda, el orden, el
 * filtro y el detalle se alimentan de esta caché.
 */
export function useCountriesCatalog() {
  return useQuery({
    queryKey: queryKeys.countries.catalog(),
    queryFn: ({ signal }) => countriesRepository.getCatalog(signal),
    staleTime: CATALOG_STALE_TIME,
    gcTime: CATALOG_GC_TIME
  });
}

/**
 * Detalle por código.
 *
 * Solo se usa cuando el código no está en el catálogo (enlace directo): el
 * camino normal es leer la fila ya cacheada.
 */
export function useCountry(code: string | null) {
  return useQuery({
    queryKey: queryKeys.countries.detail(code ?? ''),
    queryFn: ({ signal }) => {
      if (code === null) {
        throw new Error('Se pidió el detalle sin código de país.');
      }

      return countriesRepository.getByCode(code, signal);
    },
    enabled: code !== null,
    staleTime: CATALOG_STALE_TIME
  });
}
