import { type QueryParams, type QueryRecord } from './types';

/**
 * Serializa `QueryParams` al query string que el backend entiende.
 *
 * Reglas (verificadas contra el API, ver `docs/03-contratos-api.md` §2):
 * - `Sort` y `Filter` viajan como **JSON en un único parámetro**, no como
 *   `Sort[0].SortBy` (formato que el backend NO bindea).
 * - `Search.*` se omite si el texto está vacío: enviarlo vacío produce 400.
 * - `Pag.*` siempre viaja: el servidor necesita saber la página.
 */
export function buildQueryParams(query: QueryParams): URLSearchParams {
  const params = new URLSearchParams();

  params.set('Pag.Page', String(query.pag.Page));
  params.set('Pag.PageSize', String(query.pag.PageSize));

  const searchText = query.search.SearchText.trim();
  if (searchText.length > 0) {
    params.set('Search.SearchText', searchText);
    params.set('Search.Strict', String(query.search.Strict));
  }

  if (query.filter.length > 0) {
    params.set('Filter', JSON.stringify(query.filter));
  }

  if (query.sort.length > 0) {
    params.set('Sort', JSON.stringify(query.sort));
  }

  return params;
}

/**
 * Convierte un registro plano en `URLSearchParams`, omitiendo los valores vacíos.
 *
 * @example
 * toSearchParams({ 'Pag.Page': 1, q: '', 'Pag.PageSize': undefined })
 * // => "Pag.Page=1"
 */
export function toSearchParams(record: QueryRecord): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params.set(key, String(value));
  }

  return params;
}
