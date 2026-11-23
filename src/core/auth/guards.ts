import { redirect } from 'react-router';

import type { Action } from '@/core/rbac/actions';
import type { Resource } from '@/core/rbac/resources';

import { buildPermissionMap, hasPermission } from './permissions';
import { loginUrlFor, resolveRedirectTarget } from './redirect-target';
import { ensureSessionReady } from './session.service';
import { useSessionStore } from './session.store';

/**
 * Guards de ruta (capa 2 del RBAC, ADR-014).
 *
 * Se ejecutan como `loader`, antes de renderizar: una ruta protegida nunca
 * monta su componente para luego expulsar al usuario.
 *
 * @remarks
 * - Todos esperan `ensureSessionReady()`: React Router corre los loaders de la
 *   ruta raíz y de las hijas en paralelo, así que el guard de la hija no puede
 *   asumir que la restauración de sesión terminó.
 * - Reciben solo `{ request }`: del resto de `LoaderFunctionArgs` no dependen, y
 *   un contrato más estrecho se prueba sin fabricar un contexto falso.
 */
export interface GuardArgs {
  readonly request: Request;
}

async function assertAuthenticated(request: Request): Promise<void> {
  await ensureSessionReady();

  const { status, user } = useSessionStore.getState();

  if (status !== 'authenticated' || user === null) {
    const url = new URL(request.url);
    throw redirect(loginUrlFor(url.pathname, url.search));
  }
}

/** Exige sesión. Sin ella, redirige a `/login` recordando el destino. */
export async function requireAuth({ request }: GuardArgs): Promise<null> {
  await assertAuthenticated(request);
  return null;
}

/**
 * Exige sesión **y** permiso sobre un recurso.
 *
 * Un permiso insuficiente lleva a `/acceso-denegado` (no a `/login`: la sesión es
 * válida, lo que falta es autorización).
 */
export function requirePermission(resource: Resource, actions: readonly Action[]) {
  return async ({ request }: GuardArgs): Promise<null> => {
    await assertAuthenticated(request);

    const map = buildPermissionMap(useSessionStore.getState().permissions);

    if (!hasPermission(map, resource, actions)) {
      throw redirect('/acceso-denegado');
    }

    return null;
  };
}

/** Solo para visitantes: si ya hay sesión, vuelve al destino pedido o al inicio. */
export async function guestOnly({ request }: GuardArgs): Promise<null> {
  await ensureSessionReady();

  if (useSessionStore.getState().status === 'authenticated') {
    const url = new URL(request.url);
    throw redirect(resolveRedirectTarget(url.searchParams.get('redirect')));
  }

  return null;
}
