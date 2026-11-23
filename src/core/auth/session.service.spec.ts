import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { env } from '@/core/config/env';
import { ApiError } from '@/core/http/problems';
import { server } from '@/mocks/server';

import { installAuth, login, logout, refreshSession, restoreSession } from './session.service';
import { useSessionStore } from './session.store';
import { tokenStorage } from './token-storage';

const API = env.apiBaseUrl;

const admin = { username: 'admin', password: 'Admin123$' };

describe('sesión', () => {
  let onSessionExpired: Mock<() => void>;

  beforeEach(() => {
    onSessionExpired = vi.fn<() => void>();
    installAuth({ onSessionExpired });
  });

  describe('login', () => {
    it('autentica y aplana los permisos de los roles', async () => {
      await login(admin);

      const state = useSessionStore.getState();

      expect(state.status).toBe('authenticated');
      expect(state.user?.username).toBe('admin');
      expect(state.user?.roles).toEqual(['Administrador']);
      expect(state.permissions).toEqual([
        { resource: 'Nomenclators', actions: ['Leer', 'Crear', 'Actualizar', 'Eliminar'] },
        { resource: 'User', actions: ['Leer', 'Crear', 'Actualizar', 'Eliminar'] },
        { resource: 'Role', actions: ['Leer', 'Crear', 'Actualizar', 'Eliminar'] }
      ]);
      expect(tokenStorage.getAccessToken()).not.toBeNull();
    });

    it('rechaza credenciales inválidas sin tocar la sesión', async () => {
      await expect(login({ username: 'admin', password: 'mala' })).rejects.toBeInstanceOf(ApiError);

      expect(useSessionStore.getState().status).not.toBe('authenticated');
      expect(tokenStorage.getAccessToken()).toBeNull();
    });

    it('falla con un mensaje claro si el contrato de identidad no coincide', async () => {
      server.use(
        http.get(`${API}/api/auth/user/current`, () => HttpResponse.json({ id: 1, roles: [] }))
      );

      await expect(login(admin)).rejects.toThrow(/respuesta inesperada/i);
    });
  });

  describe('logout', () => {
    it('cierra la sesión local aunque el backend falle', async () => {
      await login(admin);

      server.use(http.post(`${API}/api/auth/logout`, () => HttpResponse.error()));

      await logout();

      expect(useSessionStore.getState().status).toBe('anonymous');
      expect(tokenStorage.getAccessToken()).toBeNull();
      expect(tokenStorage.hasRefreshToken()).toBe(false);
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh', () => {
    it('renueva el access token con el refresh guardado', async () => {
      await login(admin);
      tokenStorage.clearAccessTokenInMemory();

      const renewed = await refreshSession();

      expect(renewed).toBe(true);
      expect(tokenStorage.getAccessToken()).not.toBeNull();
    });

    it('sin refresh guardado devuelve false', async () => {
      await expect(refreshSession()).resolves.toBe(false);
    });

    it('un 401 del refresh cierra la sesión', async () => {
      await login(admin);
      server.use(
        http.post(`${API}/api/auth/refresh-token`, () =>
          HttpResponse.json({ title: 'Refresh inválido' }, { status: 401 })
        )
      );

      const renewed = await refreshSession();

      expect(renewed).toBe(false);
      expect(useSessionStore.getState().status).toBe('anonymous');
      expect(onSessionExpired).toHaveBeenCalledTimes(1);
    });

    it('un fallo de red NO cierra la sesión (fail-open)', async () => {
      await login(admin);
      server.use(http.post(`${API}/api/auth/refresh-token`, () => HttpResponse.error()));

      const renewed = await refreshSession();

      expect(renewed).toBe(false);
      expect(useSessionStore.getState().status).toBe('authenticated');
      expect(onSessionExpired).not.toHaveBeenCalled();
    });
  });

  describe('restoreSession', () => {
    it('sin refresh guardado deja la sesión anónima', async () => {
      await restoreSession();

      expect(useSessionStore.getState().status).toBe('anonymous');
    });

    it('restaura la identidad tras una recarga (solo hay refresh)', async () => {
      await login(admin);
      tokenStorage.clearAccessTokenInMemory();
      useSessionStore.setState({ status: 'restoring', user: null, permissions: [] });

      await restoreSession();

      const state = useSessionStore.getState();

      expect(state.status).toBe('authenticated');
      expect(state.user?.fullName).toBe('Ana Administradora');
    });

    it('si la identidad falla, cierra la sesión local', async () => {
      await login(admin);
      tokenStorage.clearAccessTokenInMemory();
      useSessionStore.setState({ status: 'restoring', user: null, permissions: [] });

      server.use(
        http.get(`${API}/api/auth/user/current`, () =>
          HttpResponse.json({ title: 'No autorizado' }, { status: 401 })
        )
      );

      await restoreSession();

      expect(useSessionStore.getState().status).toBe('anonymous');
      expect(tokenStorage.hasRefreshToken()).toBe(false);
    });
  });
});
