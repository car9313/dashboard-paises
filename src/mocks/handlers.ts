import { HttpResponse, delay, http } from 'msw';

import { env } from '@/core/config/env';

import countriesFixture from './fixtures/countries.json';
import securityFixture from './fixtures/security.json';
import usersFixture from './fixtures/users.json';

/**
 * Backend simulado para desarrollo, pruebas y e2e.
 *
 * @remarks
 * **Fidelidad al contrato real** (ver `docs/03-contratos-api.md`):
 * - `/api/country/all` pagina con `Pag.*` y devuelve `{ objects, meta }`.
 * - `Search.SearchText` **no** se aplica: el backend real responde 500 por un
 *   bug de reflexión, así que el mock tampoco busca. La UI no debe depender de
 *   que el servidor filtre.
 * - `Sort` y `Filter` se ignoran, igual que en el backend.
 * - `isUnitedState` se calcula al responder (propiedad derivada del servidor).
 *
 * Este módulo es infraestructura de pruebas: no lo importa ningún componente de
 * producción salvo el arranque condicionado por `VITE_API_MODE`.
 */

export interface CountryDto {
  readonly code: string;
  readonly name: string;
  readonly active: boolean;
  readonly isUnitedState: boolean;
}

interface SessionUserDto {
  readonly id: number;
  readonly username: string;
  readonly fullName: string;
  readonly roles: readonly {
    readonly name: string;
    readonly permissions: readonly {
      readonly resource: string;
      readonly actions: readonly string[];
    }[];
  }[];
}

interface MockUser {
  readonly username: string;
  readonly password: string;
  readonly user: SessionUserDto;
}

const seed = countriesFixture as readonly { code: string; name: string; active: boolean }[];
const users = usersFixture as readonly MockUser[];
// ── Seguridad (ADR-019): usuarios, roles y catálogo de permisos ─────────────

interface MockPermission {
  resource: string;
  description: string;
  actions: string[];
}

interface MockPermissionCategory {
  category: string;
  permissions: MockPermission[];
}

interface MockRoleRef {
  id: number;
  name: string;
}

interface MockRoleDto {
  id: number;
  name: string;
  isUnEditable: boolean;
  isUnDeletable: boolean;
  permissions: MockPermission[];
}

interface MockUserDto {
  id: number;
  username: string;
  fullName: string;
  isUnEditable: boolean;
  isUnDeletable: boolean;
  roles: MockRoleRef[];
}

const permissionsCatalog = securityFixture.permissions as MockPermissionCategory[];
const roleSeed = securityFixture.roles as MockRoleDto[];
const userSeed = securityFixture.users as MockUserDto[];

let roles: MockRoleDto[] = [...roleSeed];
let securityUsers: MockUserDto[] = [...userSeed];

function catalogDescription(resource: string): string {
  for (const category of permissionsCatalog) {
    const match = category.permissions.find((permission) => permission.resource === resource);
    if (match !== undefined) {
      return match.description;
    }
  }
  return resource;
}

/** Payload paginado que comparten todos los listados del backend. */
function paginated<T>(items: readonly T[], page: number, pageSize: number) {
  const totalCount = items.length;
  const totalPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (page - 1) * pageSize;

  return {
    objects: items.slice(start, start + pageSize),
    meta: {
      currentPage: page,
      nextPage: page < totalPage ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      totalPage,
      totalCount
    }
  };
}

let countries: CountryDto[] = [];
const sessions = new Map<string, string>();
let tokenSequence = 0;

/** El backend real impone sesión única por huella; aquí basta con invalidar tokens. */
function issueAccessToken(username: string): string {
  tokenSequence += 1;
  const token = `mock-access-${username}-${tokenSequence}`;
  sessions.set(token, username);
  return token;
}

function toDto(country: { code: string; name: string; active: boolean }): CountryDto {
  return { ...country, isUnitedState: country.code === 'US' };
}

/** Restablece los datos simulados. Las pruebas lo llaman en `afterEach`. */
export function resetMockDb(): void {
  countries = seed.map(toDto);
  roles = [...roleSeed];
  securityUsers = [...userSeed];
  sessions.clear();
}

resetMockDb();

function problem(status: number, title: string, detail?: string) {
  return HttpResponse.json(
    {
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
      title,
      status,
      ...(detail === undefined ? {} : { detail }),
      traceId: `mock-${Date.now()}`
    },
    { status }
  );
}

function bearer(request: Request): string | null {
  const header = request.headers.get('Authorization');
  return header?.startsWith('Bearer ') === true ? header.slice(7) : null;
}

function currentUser(request: Request): SessionUserDto | null {
  const token = bearer(request);
  if (token === null) {
    return null;
  }

  const username = sessions.get(token);
  return users.find((candidate) => candidate.username === username)?.user ?? null;
}

function readPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const handlers = [
  /*
   * Sonda de disponibilidad del modo simulado.
   *
   * El arranque la consulta hasta recibir la cabecera: es la única señal fiable
   * de que el worker ya atiende a esta página (ver `mocks/wait-for-control.ts`).
   * En el backend real esta ruta no existe, así que una respuesta suya nunca
   * satisface la condición.
   */
  http.get(
    `${env.apiBaseUrl}/api/__msw/ready`,
    () => new HttpResponse(null, { status: 204, headers: { 'x-msw': 'ready' } })
  ),

  http.post(`${env.apiBaseUrl}/api/auth/login`, async ({ request }) => {
    await delay(120);

    const body: unknown = await request.json();
    const credentials = body as { username?: unknown; password?: unknown };

    const match = users.find(
      (candidate) =>
        candidate.username === credentials.username && candidate.password === credentials.password
    );

    if (match === undefined) {
      return problem(401, 'Credenciales inválidas', 'Usuario o contraseña incorrectos.');
    }

    const token = issueAccessToken(match.username);

    return HttpResponse.json({
      accessToken: token,
      tokenType: 'Bearer',
      issuedAt: new Date().toISOString(),
      refreshToken: `mock-refresh-${match.username}`,
      expiresIn: 60,
      refreshTokenExpiresIn: 4320
    });
  }),

  http.post(`${env.apiBaseUrl}/api/auth/refresh-token`, async ({ request }) => {
    await delay(60);

    const body: unknown = await request.json();
    const input = body as { refreshToken?: unknown };

    const username =
      typeof input.refreshToken === 'string' && input.refreshToken.startsWith('mock-refresh-')
        ? input.refreshToken.slice('mock-refresh-'.length)
        : null;

    if (username === null || !users.some((candidate) => candidate.username === username)) {
      return problem(401, 'Refresh token inválido');
    }

    // El backend NO rota el refresh token: solo emite un access nuevo.
    return HttpResponse.json({
      accessToken: issueAccessToken(username),
      tokenType: 'Bearer',
      issuedAt: new Date().toISOString(),
      expiresIn: 60
    });
  }),

  http.post(`${env.apiBaseUrl}/api/auth/logout`, async ({ request }) => {
    const body: unknown = await request.json();
    const input = body as { refreshToken?: unknown };

    if (typeof input.refreshToken === 'string') {
      const username = input.refreshToken.replace('mock-refresh-', '');
      for (const [token, sessionUser] of sessions) {
        if (sessionUser === username) {
          sessions.delete(token);
        }
      }
    }

    return new HttpResponse(null, { status: 200 });
  }),

  http.get(`${env.apiBaseUrl}/api/auth/authenticated`, ({ request }) =>
    currentUser(request) === null
      ? problem(401, 'No autenticado')
      : new HttpResponse(null, { status: 200 })
  ),

  http.get(`${env.apiBaseUrl}/api/auth/user/current`, ({ request }) => {
    const user = currentUser(request);
    return user === null ? problem(401, 'No autenticado') : HttpResponse.json(user);
  }),

  http.get(`${env.apiBaseUrl}/api/country/all`, async ({ request }) => {
    await delay(80);

    const url = new URL(request.url);
    const page = readPositiveInt(url.searchParams.get('Pag.Page'), 1);
    const pageSize = readPositiveInt(url.searchParams.get('Pag.PageSize'), 10);

    const totalCount = countries.length;
    const totalPage = Math.max(1, Math.ceil(totalCount / pageSize));
    const start = (page - 1) * pageSize;
    const objects = countries.slice(start, start + pageSize);

    return HttpResponse.json({
      objects,
      meta: {
        currentPage: page,
        nextPage: page < totalPage ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
        totalPage,
        totalCount
      }
    });
  }),

  http.get(`${env.apiBaseUrl}/api/country/:code`, ({ params }) => {
    const code = String(params['code']);
    const country = countries.find((candidate) => candidate.code === code);
    return country === undefined ? problem(404, 'No encontrado') : HttpResponse.json(country);
  }),

  http.post(`${env.apiBaseUrl}/api/country`, async ({ request }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const body: unknown = await request.json();
    const input = body as { code?: unknown; name?: unknown };

    if (typeof input.code !== 'string' || typeof input.name !== 'string') {
      return problem(400, 'Datos inválidos');
    }

    const exists = countries.some((candidate) => candidate.code === input.code);
    if (exists) {
      return problem(409, 'Conflicto', 'Ya existe un país con ese código.');
    }

    const created: CountryDto = toDto({ code: input.code, name: input.name, active: true });
    countries = [...countries, created];

    return HttpResponse.json(created, { status: 200 });
  }),

  // `activate` va ANTES que la ruta genérica `:code`, o nunca se alcanzaría.
  http.put(`${env.apiBaseUrl}/api/country/activate/:code`, ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const code = String(params['code']);
    const target = countries.find((candidate) => candidate.code === code);
    if (target === undefined) {
      return problem(404, 'No encontrado');
    }

    countries = countries.map((candidate) =>
      candidate.code === code ? { ...candidate, active: true } : candidate
    );

    return new HttpResponse(null, { status: 200 });
  }),

  http.put(`${env.apiBaseUrl}/api/country/:code`, async ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const code = String(params['code']);
    const target = countries.find((candidate) => candidate.code === code);
    if (target === undefined) {
      return problem(404, 'No encontrado');
    }

    const body: unknown = await request.json();
    const input = body as { name?: unknown };
    if (typeof input.name !== 'string') {
      return problem(400, 'Datos inválidos');
    }

    const updated: CountryDto = { ...target, name: input.name };
    countries = countries.map((candidate) => (candidate.code === code ? updated : candidate));

    return HttpResponse.json(updated);
  }),

  http.delete(`${env.apiBaseUrl}/api/country/:code`, ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const code = String(params['code']);
    if (!countries.some((candidate) => candidate.code === code)) {
      return problem(404, 'No encontrado');
    }

    // Borrado lógico: el país sigue en el listado con `active: false`.
    countries = countries.map((candidate) =>
      candidate.code === code ? { ...candidate, active: false } : candidate
    );

    return new HttpResponse(null, { status: 200 });
  }),

  // ── Seguridad · usuarios (ADR-019) ────────────────────────────────────────

  http.get(`${env.apiBaseUrl}/api/users`, async ({ request }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    await delay(60);

    const url = new URL(request.url);
    const page = readPositiveInt(url.searchParams.get('Pag.Page'), 1);
    const pageSize = readPositiveInt(url.searchParams.get('Pag.PageSize'), 10);

    return HttpResponse.json(paginated(securityUsers, page, pageSize));
  }),

  http.get(`${env.apiBaseUrl}/api/users/:id`, ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const id = Number(params['id']);
    const found = securityUsers.find((candidate) => candidate.id === id);

    return found === undefined ? problem(404, 'No encontrado') : HttpResponse.json(found);
  }),

  http.post(`${env.apiBaseUrl}/api/users`, async ({ request }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const body: unknown = await request.json();
    const input = body as {
      userName?: unknown;
      fullName?: unknown;
      password?: unknown;
      passwordConfirmation?: unknown;
      roleIds?: unknown;
    };

    if (
      typeof input.userName !== 'string' ||
      typeof input.fullName !== 'string' ||
      typeof input.password !== 'string' ||
      typeof input.passwordConfirmation !== 'string' ||
      !Array.isArray(input.roleIds)
    ) {
      return problem(400, 'Datos inválidos');
    }

    if (input.password !== input.passwordConfirmation) {
      return problem(400, 'Las contraseñas no coinciden');
    }

    if (securityUsers.some((candidate) => candidate.username === input.userName)) {
      return problem(409, 'El usuario ya existe');
    }

    const roleIds = input.roleIds.map(Number);
    const assigned = roles
      .filter((role) => roleIds.includes(role.id))
      .map((role) => ({ id: role.id, name: role.name }));

    if (assigned.length !== roleIds.length) {
      return problem(400, 'Rol inexistente');
    }

    const created: MockUserDto = {
      id: Math.max(0, ...securityUsers.map((candidate) => candidate.id)) + 1,
      username: input.userName,
      fullName: input.fullName,
      isUnEditable: false,
      isUnDeletable: false,
      roles: assigned
    };

    securityUsers = [...securityUsers, created];

    return HttpResponse.json(created);
  }),

  http.put(`${env.apiBaseUrl}/api/users/:id`, async ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const id = Number(params['id']);
    const target = securityUsers.find((candidate) => candidate.id === id);

    if (target === undefined) {
      return problem(404, 'No encontrado');
    }

    if (target.isUnEditable) {
      return problem(409, 'El usuario no se puede editar');
    }

    const body: unknown = await request.json();
    const input = body as {
      fullName?: unknown;
      password?: unknown;
      passwordConfirmation?: unknown;
      roleIds?: unknown;
    };

    if (typeof input.fullName !== 'string' || !Array.isArray(input.roleIds)) {
      return problem(400, 'Datos inválidos');
    }

    const hasPassword = typeof input.password === 'string' && input.password.length > 0;

    if (hasPassword && input.password !== input.passwordConfirmation) {
      return problem(400, 'Las contraseñas no coinciden');
    }

    const roleIds = input.roleIds.map(Number);
    const assigned = roles
      .filter((role) => roleIds.includes(role.id))
      .map((role) => ({ id: role.id, name: role.name }));

    if (assigned.length !== roleIds.length) {
      return problem(400, 'Rol inexistente');
    }

    const updated: MockUserDto = { ...target, fullName: input.fullName, roles: assigned };
    securityUsers = securityUsers.map((candidate) => (candidate.id === id ? updated : candidate));

    return HttpResponse.json(updated);
  }),

  http.delete(`${env.apiBaseUrl}/api/users/:id`, ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const id = Number(params['id']);
    const target = securityUsers.find((candidate) => candidate.id === id);

    if (target === undefined) {
      return problem(404, 'No encontrado');
    }

    if (target.isUnDeletable) {
      return problem(409, 'El usuario no se puede eliminar');
    }

    securityUsers = securityUsers.filter((candidate) => candidate.id !== id);

    return new HttpResponse(null, { status: 200 });
  }),

  http.post(`${env.apiBaseUrl}/api/users/:id/reset-password`, ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const id = Number(params['id']);
    if (!securityUsers.some((candidate) => candidate.id === id)) {
      return problem(404, 'No encontrado');
    }

    return HttpResponse.json({ password: `Tmp-${String(id)}-2026` });
  }),

  // ── Seguridad · roles y permisos ──────────────────────────────────────────
  // El catálogo va ANTES de `:id`: si no, `permissions` se leería como un id.

  http.get(`${env.apiBaseUrl}/api/roles/permissions`, () => HttpResponse.json(permissionsCatalog)),

  http.get(`${env.apiBaseUrl}/api/roles/:roleId/permissions`, ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const roleId = Number(params['roleId']);
    const role = roles.find((candidate) => candidate.id === roleId);

    if (role === undefined) {
      return problem(404, 'No encontrado');
    }

    const assigned: MockPermissionCategory[] = permissionsCatalog.map((category) => ({
      category: category.category,
      permissions: category.permissions.map((permission) => ({
        ...permission,
        actions:
          role.permissions.find((entry) => entry.resource === permission.resource)?.actions ?? []
      }))
    }));

    return HttpResponse.json(assigned);
  }),

  http.put(`${env.apiBaseUrl}/api/roles/:id/permissions`, async ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const id = Number(params['id']);
    const role = roles.find((candidate) => candidate.id === id);

    if (role === undefined) {
      return problem(404, 'No encontrado');
    }

    if (role.isUnEditable) {
      return problem(409, 'El rol no se puede editar');
    }

    const body: unknown = await request.json();

    if (!Array.isArray(body)) {
      return problem(400, 'Datos inválidos');
    }

    const grouped = new Map<string, string[]>();

    for (const item of body as { resource?: unknown; actionType?: unknown }[]) {
      if (typeof item.resource !== 'string' || typeof item.actionType !== 'string') {
        return problem(400, 'Datos inválidos');
      }

      grouped.set(item.resource, [...(grouped.get(item.resource) ?? []), item.actionType]);
    }

    const permissions: MockPermission[] = [...grouped.entries()].map(([resource, actions]) => ({
      resource,
      description: catalogDescription(resource),
      actions
    }));

    roles = roles.map((candidate) =>
      candidate.id === id ? { ...candidate, permissions } : candidate
    );

    return new HttpResponse(null, { status: 200 });
  }),

  http.get(`${env.apiBaseUrl}/api/roles`, async ({ request }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    await delay(60);

    const url = new URL(request.url);
    const page = readPositiveInt(url.searchParams.get('Pag.Page'), 1);
    const pageSize = readPositiveInt(url.searchParams.get('Pag.PageSize'), 10);

    return HttpResponse.json(paginated(roles, page, pageSize));
  }),

  http.get(`${env.apiBaseUrl}/api/roles/:id`, ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const id = Number(params['id']);
    const found = roles.find((candidate) => candidate.id === id);

    return found === undefined ? problem(404, 'No encontrado') : HttpResponse.json(found);
  }),

  http.post(`${env.apiBaseUrl}/api/roles`, async ({ request }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const body: unknown = await request.json();
    const input = body as { name?: unknown };

    if (typeof input.name !== 'string' || input.name.trim().length === 0) {
      return problem(400, 'Datos inválidos');
    }

    const roleName = input.name.trim();

    if (roles.some((candidate) => candidate.name.toLowerCase() === roleName.toLowerCase())) {
      return problem(409, 'El rol ya existe');
    }

    const created: MockRoleDto = {
      id: Math.max(0, ...roles.map((candidate) => candidate.id)) + 1,
      name: roleName,
      isUnEditable: false,
      isUnDeletable: false,
      permissions: []
    };

    roles = [...roles, created];

    return HttpResponse.json(created);
  }),

  http.put(`${env.apiBaseUrl}/api/roles/:id`, async ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const id = Number(params['id']);
    const target = roles.find((candidate) => candidate.id === id);

    if (target === undefined) {
      return problem(404, 'No encontrado');
    }

    if (target.isUnEditable) {
      return problem(409, 'El rol no se puede editar');
    }

    const body: unknown = await request.json();
    const input = body as { name?: unknown };

    if (typeof input.name !== 'string' || input.name.trim().length === 0) {
      return problem(400, 'Datos inválidos');
    }

    const updated: MockRoleDto = { ...target, name: input.name };
    roles = roles.map((candidate) => (candidate.id === id ? updated : candidate));

    return HttpResponse.json(updated);
  }),

  http.delete(`${env.apiBaseUrl}/api/roles/:id`, ({ request, params }) => {
    if (currentUser(request) === null) {
      return problem(401, 'No autenticado');
    }

    const id = Number(params['id']);
    const target = roles.find((candidate) => candidate.id === id);

    if (target === undefined) {
      return problem(404, 'No encontrado');
    }

    if (target.isUnDeletable) {
      return problem(409, 'El rol no se puede eliminar');
    }

    roles = roles.filter((candidate) => candidate.id !== id);

    return new HttpResponse(null, { status: 200 });
  })
];
