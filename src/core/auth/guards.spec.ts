import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTIONS } from '@/core/rbac/actions';
import { RESOURCES } from '@/core/rbac/resources';

import { guestOnly, requireAuth, requirePermission } from './guards';
import { installAuth } from './session.service';
import { useSessionStore, type SessionUser } from './session.store';

const user: SessionUser = {
  id: '1',
  username: 'consulta',
  fullName: 'Carlos Consulta',
  roles: ['Consulta']
};

function args(path = '/nomencladores/paises') {
  return { request: new Request(`http://localhost:5173${path}`) };
}

function locationOf(error: unknown): string {
  return error instanceof Response ? (error.headers.get('Location') ?? '') : '';
}

function authenticate(actions: readonly string[]) {
  useSessionStore.setState({
    status: 'authenticated',
    user,
    permissions: [{ resource: RESOURCES.Nomenclators, actions }]
  });
}

describe('guards', () => {
  beforeEach(() => {
    installAuth({ onSessionExpired: vi.fn() });
  });

  describe('requireAuth', () => {
    it('redirige al login recordando el destino', async () => {
      const error = await requireAuth(args('/nomencladores/paises?page=2')).catch(
        (caught: unknown) => caught
      );

      expect(locationOf(error)).toContain('/login?redirect=');
      expect(locationOf(error)).toContain(encodeURIComponent('/nomencladores/paises?page=2'));
    });

    it('deja pasar a un usuario autenticado', async () => {
      authenticate([ACTIONS.Read]);

      await expect(requireAuth(args())).resolves.toBeNull();
    });

    it('trata una sesión sin identidad como anónima', async () => {
      useSessionStore.setState({ status: 'authenticated', user: null, permissions: [] });

      const error = await requireAuth(args()).catch((caught: unknown) => caught);

      expect(locationOf(error)).toContain('/login');
    });
  });

  describe('requirePermission', () => {
    it('permite la ruta con el permiso requerido', async () => {
      authenticate([ACTIONS.Read]);

      await expect(
        requirePermission(RESOURCES.Nomenclators, [ACTIONS.Read])(args())
      ).resolves.toBeNull();
    });

    it('lleva a acceso denegado cuando falta la acción', async () => {
      authenticate([ACTIONS.Read]);

      const error = await requirePermission(RESOURCES.Nomenclators, [ACTIONS.Create])(args()).catch(
        (caught: unknown) => caught
      );

      expect(locationOf(error)).toBe('/acceso-denegado');
    });

    it('lleva al login si además no hay sesión', async () => {
      const error = await requirePermission(RESOURCES.Nomenclators, [ACTIONS.Read])(args()).catch(
        (caught: unknown) => caught
      );

      expect(locationOf(error)).toContain('/login');
    });
  });

  describe('guestOnly', () => {
    it('deja entrar al login sin sesión', async () => {
      await expect(guestOnly(args('/login'))).resolves.toBeNull();
    });

    it('expulsa al inicio a quien ya tiene sesión', async () => {
      authenticate([ACTIONS.Read]);

      const error = await guestOnly(args('/login')).catch((caught: unknown) => caught);

      expect(locationOf(error)).toBe('/');
    });

    it('respeta el destino interno al expulsar', async () => {
      authenticate([ACTIONS.Read]);

      const error = await guestOnly(args('/login?redirect=%2Fnomencladores%2Fpaises')).catch(
        (caught: unknown) => caught
      );

      expect(locationOf(error)).toBe('/nomencladores/paises');
    });

    it('ignora un destino externo (open redirect)', async () => {
      authenticate([ACTIONS.Read]);

      const error = await guestOnly(args('/login?redirect=https%3A%2F%2Fevil.example')).catch(
        (caught: unknown) => caught
      );

      expect(locationOf(error)).toBe('/');
    });
  });
});
