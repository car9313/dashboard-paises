import { request } from '@/core/http/client';
import { buildQueryParams } from '@/core/http/params';
import type { QueryParams } from '@/core/http/types';

import { countryPageDtoSchema } from './dto';
import type { Country, CountryCatalog, CountryInput } from '../domain/country';
import { toDomain, toWriteDto } from './mapper';

/**
 * Único punto de contacto con `/api/country`.
 *
 * @remarks
 * - El catálogo se pide completo (`PageSize = 250`) porque el nomenclador está
 *   acotado y el backend no filtra ni ordena de forma fiable (ADR-013). La
 *   búsqueda, el orden y el filtro se resuelven en cliente.
 * - Todas las respuestas se validan con Zod antes de mapear: un cambio de
 *   contrato falla con un mensaje claro en lugar de propagar `undefined`.
 * - El detalle por código se mantiene implementado, pero la UI lo usa solo como
 *   respaldo: normalmente se sirve del catálogo en caché.
 */

const ENDPOINT = '/api/country';

/** Tamaño de página que garantiza traer el nomenclador completo. */
export const CATALOG_PAGE_SIZE = 250;

function catalogQuery(): QueryParams {
  return {
    search: { SearchText: '', Strict: false },
    filter: [],
    sort: [],
    pag: { Page: 1, PageSize: CATALOG_PAGE_SIZE }
  };
}

function invalidContract(path: string): Error {
  return new Error(`El servidor devolvió una respuesta inesperada en ${path}.`);
}

export const countriesRepository = {
  /** Catálogo completo, validado y mapeado a dominio. */
  async getCatalog(signal?: AbortSignal): Promise<CountryCatalog> {
    const payload = await request<unknown>(`${ENDPOINT}/all`, {
      query: buildQueryParams(catalogQuery()),
      ...(signal === undefined ? {} : { signal })
    });

    const parsed = countryPageDtoSchema.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(`${ENDPOINT}/all`);
    }

    return {
      countries: parsed.data.objects.map(toDomain),
      totalCount: parsed.data.meta.totalCount
    };
  },

  /** Detalle por código (respaldo para enlaces directos). */
  async getByCode(code: string, signal?: AbortSignal): Promise<Country> {
    const payload = await request<unknown>(`${ENDPOINT}/${encodeURIComponent(code)}`, {
      ...(signal === undefined ? {} : { signal })
    });

    const parsed = countryPageDtoSchema.shape.objects.element.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(`${ENDPOINT}/{code}`);
    }

    return toDomain(parsed.data);
  },

  async create(input: CountryInput): Promise<Country> {
    const payload = await request<unknown>(ENDPOINT, {
      method: 'POST',
      body: toWriteDto(input)
    });

    const parsed = countryPageDtoSchema.shape.objects.element.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(ENDPOINT);
    }

    return toDomain(parsed.data);
  },

  async update(code: string, name: string): Promise<Country> {
    const payload = await request<unknown>(`${ENDPOINT}/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: { name }
    });

    const parsed = countryPageDtoSchema.shape.objects.element.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(`${ENDPOINT}/{code}`);
    }

    return toDomain(parsed.data);
  },

  /**
   * Activa o desactiva un país.
   *
   * Desactivar es un `DELETE` que **no borra**: el registro sigue en el listado
   * con `active: false` (borrado lógico del dominio).
   */
  async setActive(code: string, active: boolean): Promise<void> {
    const path = `${ENDPOINT}/${active ? 'activate/' : ''}${encodeURIComponent(code)}`;

    await request<unknown>(path, {
      method: active ? 'PUT' : 'DELETE',
      ...(active ? { body: {} } : {})
    });
  }
};
