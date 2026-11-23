/**
 * Contrato de paginación y filtrado del backend .NET.
 *
 * Los nombres respetan el *wire* (`Pag.Page`, `Search.SearchText`…) porque son
 * los que el binder del servidor espera. El dominio no usa estos tipos: viven
 * en `core/http` y solo los tocan los repositorios.
 */

export const DEFAULT_PAGE_SIZE = 10;

export interface Pag {
  Page: number;
  PageSize: number;
}

export interface Search {
  SearchText: string;
  Strict: boolean;
}

export interface Filter {
  PropertyName: string;
  PropertyValue: string;
}

export interface Sort {
  SortBy: string;
  Ascending: boolean;
}

export interface QueryParams {
  search: Search;
  filter: Filter[];
  sort: Sort[];
  pag: Pag;
}

export interface PageMeta {
  currentPage: number;
  nextPage: number | null;
  prevPage: number | null;
  totalPage: number;
  totalCount: number;
}

export interface PaginatedResponse<T> {
  objects: T[];
  meta: PageMeta;
}

/**
 * Parámetros de consulta arbitrarios para `client.get`.
 *
 * Los valores `undefined`, `null` y `''` **se omiten**: el backend valida con
 * `[Required]` y responde 400 si `Search.SearchText` viaja vacío.
 */
export type QueryRecord = Record<string, string | number | boolean | undefined | null>;

/**
 * Documento de error del backend (RFC 9110 `ProblemDetails` + extensión propia).
 */
export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  /** Algunos endpoints devuelven `{ success, message, detail }`. */
  success?: boolean;
  message?: string;
}
