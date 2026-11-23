import { countriesQueryStateSchema, type CountriesQueryState } from './countries-query-schema';

/**
 * Persistencia de los filtros del listado en `sessionStorage`.
 *
 * Portado del feature `withFiltersPersistence` del proyecto Angular de origen
 * (`core/store/features/with-filters-persistence.feature.ts`), con la misma
 * política y dos diferencias deliberadas.
 *
 * @remarks
 * **Quién manda.** En el origen el store es dueño y `sessionStorage` su espejo.
 * Aquí el dueño es la **URL** (ADR-018); esto solo aporta la semilla cuando el
 * usuario entra a la pantalla sin parámetros —al volver por el menú—. Si la URL
 * trae algo, lo guardado se ignora.
 *
 * **Una clave por usuario.** El origen limpia al cerrar sesión; aquí la clave
 * incluye el identificador del usuario, así que dos personas que compartan
 * equipo no se ven los filtros y ninguno pierde los suyos al salir.
 *
 * Política heredada del origen, porque resolvía casos reales:
 * - **`sessionStorage`, no `localStorage`**: los filtros son de la pestaña.
 * - **Versionado**: un payload de otra versión se descarta en silencio (la forma
 *   aquí es `q/status/sort/dir/page/size`, distinta de `search/pag` del origen,
 *   así que un payload ajeno nunca encaja).
 * - **TTL**: pasado el tiempo se descarta. El origen lo tenía opcional; aquí son
 *   12 h porque un filtro de ayer confunde más que ayuda.
 * - **JSON corrupto o almacenamiento no disponible** (modo privado, cuota): se
 *   limpia y la pantalla sigue. Nunca un `throw` que rompa el listado.
 * - **Borrado explícito** al limpiar filtros.
 */

/** Prefijo de la clave del origen para el listado de países. */
export const COUNTRY_FILTERS_STORAGE_PREFIX = 'countries.list.filters';

/**
 * Versión del formato persistido.
 *
 * Se incrementa si cambia la forma del estado o un valor por defecto (por
 * ejemplo, el tamaño de página): un payload viejo restauraría el valor anterior.
 */
const STORAGE_VERSION = 1;

/** Vida útil del payload. */
const TTL_MS = 12 * 60 * 60 * 1000;

interface PersistedPayload {
  readonly version: number;
  readonly savedAt: number;
  readonly data: unknown;
}

/** Clave efectiva para un usuario. */
export function countryFiltersStorageKey(ownerId: string): string {
  return `${COUNTRY_FILTERS_STORAGE_PREFIX}:${ownerId}`;
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    // Acceso bloqueado por política del navegador.
    return null;
  }
}

/**
 * Guarda el estado actual.
 *
 * Silencioso a propósito: si el navegador no deja escribir, la vista sigue
 * funcionando igual; la persistencia es una comodidad, no un requisito.
 */
export function saveCountryFilters(ownerId: string, state: CountriesQueryState): void {
  const store = storage();

  if (store === null) {
    return;
  }

  const payload: PersistedPayload = { version: STORAGE_VERSION, savedAt: Date.now(), data: state };

  try {
    store.setItem(countryFiltersStorageKey(ownerId), JSON.stringify(payload));
  } catch {
    // Cuota llena o almacenamiento no disponible: no-op.
  }
}

/**
 * Devuelve el estado guardado del usuario o `null` si no hay nada utilizable.
 *
 * Descarta —y borra— payloads de otra versión, vencidos, corruptos o con una
 * forma que no encaja. La validación es **estricta** (a diferencia de la URL,
 * que corrige): restaurar medio filtro sería peor que no restaurarlo.
 */
export function loadCountryFilters(ownerId: string): CountriesQueryState | null {
  const store = storage();

  if (store === null) {
    return null;
  }

  const key = countryFiltersStorageKey(ownerId);
  let raw: string | null;

  try {
    raw = store.getItem(key);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      return discard(store, key);
    }

    const payload = parsed as Partial<PersistedPayload>;

    if (payload.version !== STORAGE_VERSION || typeof payload.savedAt !== 'number') {
      return discard(store, key);
    }

    if (Date.now() - payload.savedAt > TTL_MS) {
      return discard(store, key);
    }

    const result = countriesQueryStateSchema.safeParse(payload.data);

    if (!result.success) {
      return discard(store, key);
    }

    return result.data;
  } catch {
    // JSON corrupto.
    return discard(store, key);
  }
}

/** Borra la persistencia del usuario (al limpiar los filtros). */
export function clearCountryFilters(ownerId: string): void {
  try {
    storage()?.removeItem(countryFiltersStorageKey(ownerId));
  } catch {
    // no-op
  }
}

function discard(store: Storage, key: string): null {
  try {
    store.removeItem(key);
  } catch {
    // no-op
  }

  return null;
}
