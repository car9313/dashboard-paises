import { installAuth } from '@/core/auth/session.service';
import { login } from '@/core/auth/session.service';

export type TestUser = 'admin' | 'consulta' | 'sinautorizacion';

const PASSWORDS: Record<TestUser, string> = {
  admin: 'Admin123$',
  consulta: 'Consulta123$',
  sinautorizacion: 'SinAcceso123$'
};

/**
 * Autentica contra el backend simulado (MSW).
 *
 * Se usa el flujo real —login → tokens → `user/current` → sesión— en lugar de
 * fabricar el estado a mano: así las pruebas de escritura ejercitan también el
 * `Bearer` del cliente HTTP, que es donde se rompen las cosas.
 */
export async function signInAs(user: TestUser): Promise<void> {
  installAuth({ onSessionExpired: () => undefined });
  await login({ username: user, password: PASSWORDS[user] });
}
