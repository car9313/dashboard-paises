import { z } from 'zod';

import { request } from '@/core/http/client';

import type { Permission } from './permissions';
import type { SessionUser } from './session.store';

/**
 * Contrato HTTP de autenticación, validado con Zod en el borde.
 *
 * El backend no es una fuente confiable de la forma: si `user/current` cambia
 * (o devuelve `null` en `permissions`), el esquema falla con un mensaje claro en
 * lugar de propagar `undefined` hasta un `hasPermission` que devolvería `false`
 * en silencio.
 */

const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number(),
  refreshTokenExpiresIn: z.number()
});

const refreshResponseSchema = z.object({
  accessToken: z.string().min(1),
  expiresIn: z.number()
});

const permissionSchema = z.object({
  resource: z.string().min(1),
  actions: z.array(z.string())
});

const roleSchema = z.object({
  name: z.string(),
  permissions: z.array(permissionSchema).nullish()
});

const currentUserSchema = z.object({
  id: z.union([z.number(), z.string()]),
  username: z.string().min(1),
  fullName: z.string(),
  roles: z.array(roleSchema)
});

export interface LoginCredentials {
  readonly username: string;
  readonly password: string;
}

export interface LoginTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresIn: number;
  readonly refreshTokenExpiresIn: number;
}

export interface RefreshedTokens {
  readonly accessToken: string;
  readonly expiresIn: number;
}

export interface Identity {
  readonly user: SessionUser;
  readonly permissions: readonly Permission[];
}

function invalidContract(what: string): Error {
  return new Error(`El servidor devolvió una respuesta inesperada en ${what}.`);
}

/**
 * Aplana la identidad del wire al modelo de sesión.
 *
 * Las acciones se deduplican por recurso al construir el mapa (`permissions.ts`),
 * aquí solo se proyecta la forma.
 */
export function toIdentity(payload: unknown): Identity {
  const parsed = currentUserSchema.safeParse(payload);

  if (!parsed.success) {
    throw invalidContract('/api/auth/user/current');
  }

  const { id, username, fullName, roles } = parsed.data;

  const permissions: Permission[] = roles.flatMap((role) =>
    (role.permissions ?? []).map((permission) => ({
      resource: permission.resource,
      actions: permission.actions
    }))
  );

  return {
    user: { id: String(id), username, fullName, roles: roles.map((role) => role.name) },
    permissions
  };
}

export const sessionApi = {
  async login(credentials: LoginCredentials, fingerprint: string): Promise<LoginTokens> {
    const payload = await request<unknown>('/api/auth/login', {
      method: 'POST',
      body: { username: credentials.username, password: credentials.password, fingerprint },
      skipAuth: true
    });

    const parsed = loginResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw invalidContract('/api/auth/login');
    }

    return parsed.data;
  },

  async refresh(refreshToken: string): Promise<RefreshedTokens> {
    const payload = await request<unknown>('/api/auth/refresh-token', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true
    });

    const parsed = refreshResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw invalidContract('/api/auth/refresh-token');
    }

    return parsed.data;
  },

  /** Cierra la sesión en el backend. Un fallo aquí no debe impedir el logout local. */
  async logout(refreshToken: string): Promise<void> {
    await request<unknown>('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken }
    });
  },

  async currentUser(): Promise<Identity> {
    const payload = await request<unknown>('/api/auth/user/current');
    return toIdentity(payload);
  }
};
