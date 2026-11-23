import { request } from '@/core/http/client';
import { buildQueryParams } from '@/core/http/params';
import type { QueryParams } from '@/core/http/types';

import type { ActionCommand, PermissionCategory, Role } from '../domain/role';
import { permissionCatalogDtoSchema, roleDtoSchema, rolePageDtoSchema } from './dto';
import { toDomainCatalog, toDomainRole } from './mapper';

/**
 * Único punto de contacto con `/api/roles`.
 *
 * @remarks
 * - **Catálogo primero**: los roles son pocos y el listado los necesita
 *   completos (multiselect de usuarios y editor de permisos), así que se piden
 *   con `PageSize` amplio y se filtra en cliente.
 * - Los permisos se guardan **planos** (`{ resource, actionType }[]`), no como el
 *   árbol que se pinta: el aplanado lo hace la UI al construir el payload.
 */

const ENDPOINT = '/api/roles';
const CATALOG_PAGE_SIZE = 100;

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

export const rolesRepository = {
  async listAll(signal?: AbortSignal): Promise<readonly Role[]> {
    const payload = await request<unknown>(ENDPOINT, {
      query: buildQueryParams(pageQuery(1, CATALOG_PAGE_SIZE)),
      ...(signal === undefined ? {} : { signal })
    });

    const parsed = rolePageDtoSchema.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(ENDPOINT);
    }

    return parsed.data.objects.map(toDomainRole);
  },

  async getPermissionsCatalog(signal?: AbortSignal): Promise<readonly PermissionCategory[]> {
    const payload = await request<unknown>(`${ENDPOINT}/permissions`, {
      ...(signal === undefined ? {} : { signal })
    });

    const parsed = permissionCatalogDtoSchema.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(`${ENDPOINT}/permissions`);
    }

    return toDomainCatalog(parsed.data);
  },

  async getPermissionsByRole(
    roleId: number,
    signal?: AbortSignal
  ): Promise<readonly PermissionCategory[]> {
    const payload = await request<unknown>(`${ENDPOINT}/${String(roleId)}/permissions`, {
      ...(signal === undefined ? {} : { signal })
    });

    const parsed = permissionCatalogDtoSchema.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(`${ENDPOINT}/{roleId}/permissions`);
    }

    return toDomainCatalog(parsed.data);
  },

  async updatePermissions(roleId: number, actions: readonly ActionCommand[]): Promise<void> {
    await request<unknown>(`${ENDPOINT}/${String(roleId)}/permissions`, {
      method: 'PUT',
      body: [...actions]
    });
  },

  async create(name: string): Promise<Role> {
    const payload = await request<unknown>(ENDPOINT, { method: 'POST', body: { name } });

    const parsed = roleDtoSchema.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(ENDPOINT);
    }

    return toDomainRole(parsed.data);
  },

  async rename(id: number, name: string): Promise<Role> {
    const payload = await request<unknown>(`${ENDPOINT}/${String(id)}`, {
      method: 'PUT',
      body: { name }
    });

    const parsed = roleDtoSchema.safeParse(payload);

    if (!parsed.success) {
      throw invalidContract(`${ENDPOINT}/{id}`);
    }

    return toDomainRole(parsed.data);
  },

  async remove(id: number): Promise<void> {
    await request<unknown>(`${ENDPOINT}/${String(id)}`, { method: 'DELETE' });
  }
};
