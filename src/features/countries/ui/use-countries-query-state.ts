import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router';

import { useSessionStore } from '@/core/auth/session.store';

import type { CountrySortKey, CountryStatus, SortDirection } from '../domain/country-list';
import {
  clearCountryFilters,
  loadCountryFilters,
  saveCountryFilters
} from './country-filters-storage';
import {
  COUNTRIES_DEFAULT_PAGE_SIZE,
  isDefaultQueryState,
  MAX_QUERY_LENGTH,
  toSearchParams,
  urlQueryStateSchema,
  type CountriesQueryState
} from './countries-query-schema';

export {
  COUNTRIES_DEFAULT_PAGE_SIZE,
  COUNTRIES_PAGE_SIZE_OPTIONS,
  type CountriesQueryState
} from './countries-query-schema';

export interface CountriesQueryActions {
  readonly state: CountriesQueryState;
  /** `true` si hay búsqueda o filtro de estado activos. */
  readonly hasFilters: boolean;
  setQuery: (query: string) => void;
  setStatus: (status: CountryStatus) => void;
  /** Cambia la columna; si es la misma, invierte la dirección. */
  setSort: (key: CountrySortKey) => void;
  setPage: (page: number) => void;
  setSize: (size: number) => void;
  reset: () => void;
}

const SORT_KEYS: readonly string[] = ['name', 'code'];

/**
 * Estado de la vista de países, con la **URL como fuente de verdad** (ADR-018).
 *
 * @remarks
 * La URL sobrevive a F5, se puede compartir un listado filtrado y el botón atrás
 * funciona. `sessionStorage` **no compite** con ella: solo aporta la semilla
 * cuando se entra sin parámetros (volver por el menú), y se actualiza con cada
 * cambio para que esa semilla sea la última vista real.
 *
 * El proyecto origen usaba un store como dueño y `sessionStorage` como espejo;
 * aquí el espejo alimenta únicamente al dueño cuando llega vacío.
 *
 * Los valores inválidos en la URL no rompen la pantalla: el esquema tolerante
 * los devuelve a su valor por defecto.
 */
export function useCountriesQueryState(): CountriesQueryActions {
  const [searchParams, setSearchParams] = useSearchParams();

  // Los filtros son del usuario: dos personas en el mismo equipo no se mezclan.
  const ownerId = useSessionStore((session) => session.user?.id);
  const storageOwner = ownerId === undefined ? 'anon' : String(ownerId);

  const state = useMemo(
    () => urlQueryStateSchema.parse(Object.fromEntries(searchParams.entries())),
    [searchParams]
  );

  const update = useCallback(
    (patch: Partial<CountriesQueryState>, replace: boolean) => {
      const next = { ...state, ...patch };
      setSearchParams(toSearchParams(next), { replace });
    },
    [state, setSearchParams]
  );

  const restored = useRef(false);

  /*
   * Restauración: una sola vez, y solo si la URL no trae nada. Si el usuario
   * llegó por un enlace con parámetros, esa URL manda y lo guardado se ignora.
   */
  useEffect(() => {
    if (restored.current) {
      return;
    }

    restored.current = true;

    if (searchParams.toString() !== '') {
      return;
    }

    const saved = loadCountryFilters(storageOwner);

    if (saved === null) {
      return;
    }

    const params = toSearchParams(saved);

    if (params.toString() !== '') {
      setSearchParams(params, { replace: true });
    }
  }, [searchParams, setSearchParams, storageOwner]);

  /*
   * Persistencia: es un efecto secundario externo, no una sincronización de
   * estado derivado. `state` cambia solo cuando cambia la URL.
   */
  useEffect(() => {
    if (isDefaultQueryState(state)) {
      // Vista por defecto: no hay nada que recordar y se evita dejar basura.
      clearCountryFilters(storageOwner);
      return;
    }

    saveCountryFilters(storageOwner, state);
  }, [state, storageOwner]);

  return {
    state,
    hasFilters: state.q.length > 0 || state.status !== 'all',

    /*
     * La búsqueda se escribe con `replace`: cada tecla no debe crear una entrada
     * de historial. Los filtros y la paginación sí se empujan, para que «atrás»
     * deshaga el cambio anterior.
     */
    setQuery: (query) => {
      if (query !== state.q) {
        update({ q: query.slice(0, MAX_QUERY_LENGTH), page: 1 }, true);
      }
    },

    setStatus: (status) => {
      if (status !== state.status) {
        update({ status, page: 1 }, false);
      }
    },

    setSort: (key) => {
      const dir: SortDirection = state.sort === key && state.dir === 'asc' ? 'desc' : 'asc';
      update({ sort: key, dir, page: 1 }, false);
    },

    setPage: (page) => {
      if (page !== state.page) {
        update({ page: Math.max(1, page) }, false);
      }
    },

    setSize: (size) => {
      if (size !== state.size) {
        update({ size, page: 1 }, false);
      }
    },

    reset: () => {
      // Borra la semilla: si se limpia y se recarga, no deben reaparecer.
      clearCountryFilters(storageOwner);
      update(
        {
          q: '',
          status: 'all',
          sort: 'name',
          dir: 'asc',
          page: 1,
          size: COUNTRIES_DEFAULT_PAGE_SIZE
        },
        true
      );
    }
  };
}

/** `true` si el valor es una columna ordenable (guarda contra la URL editada). */
export function isCountrySortKey(value: string): value is CountrySortKey {
  return SORT_KEYS.includes(value);
}
