import { request } from '@/core/http/client';
import { buildQueryParams } from '@/core/http/params';
import type { QueryParams } from '@/core/http/types';

import type { CreateUserInput, UpdateUserInput, User, UserPage } from '../domain/user';
import { resetPasswordResponseSchema, userDtoSchema, userPageDtoSchema } from './dto';
import { toCreateDto, toDomain, toUpdateDto } from './mapper';

/**
 * Único punto de contacto con `/api/users`.
 *
 * @remarks
 * - **Paginación de servidor** con `Pag.Page` / `Pag.PageSize`, los únicos
 *   parámetros del `SearchQuery` que este backend respeta (ADR-019).
 * - **`Search.SearchText` se omite**: con texto devuelve 500 (BE-001). Buscar
 *   usuarios en el servidor no es posible hoy; la UI filtra en cliente sobre lo
 *   cargado y lo advierte.
 * - Todas las respuestas se validan con Zod antes de mapear.
 */

const ENDPOINT = '/api/users';
const DEFAULT_PAGE_SIZE = 10;

function invalidContract(path: string): Error {
  return new Error(`El servidor devolvió una respuesta inesperada en ${path}.`);
}

function pageQuery(page: number, pageSize: number): QueryParams {
  return {
    search: { SearchText: '', Strict: false },
    filter: [],
    sort: [],
    pag: { Page: page, PageSize: pageSize }
  };
}

export const usersRepository = {
  async list(
    params: { readonly page: number; readonly pageSize?: number },
    signal?: AbortSignal
  ): Promise<UserPage> {
    const payload = await request<unknown>(ENDPOINT, {
      query: buildQueryParams(pageQuery(params.page, params.pageSize ?? DEFAULT_PAGE_SIZE)),
      ...(signal === undefined ? {} : { signal })
    });

    const parsed = userPageDtoSchema.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(ENDPOINT);
    }

    return {
      users: parsed.data.objects.map(toDomain),
      meta: {
        currentPage: parsed.data.meta.currentPage,
        totalPages: Math.max(1, parsed.data.meta.totalPage),
        totalCount: parsed.data.meta.totalCount
      }
    };
  },

  async create(input: CreateUserInput): Promise<User> {
    const payload = await request<unknown>(ENDPOINT, {
      method: 'POST',
      body: toCreateDto(input)
    });

    const parsed = userDtoSchema.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(ENDPOINT);
    }

    return toDomain(parsed.data);
  },

  async update(input: UpdateUserInput): Promise<User> {
    const payload = await request<unknown>(`${ENDPOINT}/${String(input.id)}`, {
      method: 'PUT',
      body: toUpdateDto(input)
    });

    const parsed = userDtoSchema.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(`${ENDPOINT}/{id}`);
    }

    return toDomain(parsed.data);
  },

  async remove(id: number): Promise<void> {
    await request<unknown>(`${ENDPOINT}/${String(id)}`, { method: 'DELETE' });
  },

  /**
   * Restablece la contraseña y devuelve la clave temporal si el backend la
   * incluye en el cuerpo (`null` si responde sin contenido).
   */
  async resetPassword(id: number): Promise<string | null> {
    const payload = await request<unknown>(`${ENDPOINT}/${String(id)}/reset-password`, {
      method: 'POST',
      body: null
    });

    const parsed = resetPasswordResponseSchema.safeParse(payload);

    return parsed.success && parsed.data.password !== undefined ? parsed.data.password : null;
  }
};
