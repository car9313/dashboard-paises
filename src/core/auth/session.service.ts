import { setAuthProvider } from '@/core/http/client';
import { ApiError } from '@/core/http/problems';
import { queryClient } from '@/core/query/query-client';

import { getDeviceFingerprint } from './device-fingerprint';
import { sessionApi, type LoginCredentials } from './session.api';
import { useSessionStore } from './session.store';
import { tokenStorage } from './token-storage';

/**
 * Orquestación de la sesión.
 *
 * Es el único módulo que combina IO (API), almacenamiento de tokens y estado
 * global; los componentes y las rutas solo llaman a `login`, `logout` y a los
 * guards. Así la regla «un dueño por dato» se mantiene: nadie más escribe la
 * sesión ni toca los tokens.
 */

/** Se registra en el arranque: la navegación la decide el router, no este módulo. */
let sessionExpiryHandler: (() => void) | null = null;

/** Barrera de arranque: todas las rutas esperan la misma restauración. */
let restorePromise: Promise<void> | null = null;

export function setSessionExpiryHandler(handler: () => void): void {
  sessionExpiryHandler = handler;
}

/**
 * Cierra la sesión local (no la remota) y avisa a quien corresponda.
 *
 * Se usa cuando el backend dice que la sesión murió: `418`, refresh rechazado o
 * logout explícito.
 */
export function handleSessionExpired(): void {
  tokenStorage.clear();
  useSessionStore.getState().setAnonymous();
  queryClient.clear();
  sessionExpiryHandler?.();
}

/** Autentica, persiste los tokens y proyecta la identidad del API. */
export async function login(credentials: LoginCredentials): Promise<void> {
  const fingerprint = getDeviceFingerprint();
  const tokens = await sessionApi.login(credentials, fingerprint);

  await tokenStorage.persist({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    refreshTokenExpiresIn: tokens.refreshTokenExpiresIn
  });

  // La identidad y los permisos SIEMPRE vienen del API, nunca del JWT.
  const identity = await sessionApi.currentUser();
  useSessionStore.getState().setSession(identity.user, identity.permissions);
}

/**
 * Cierra sesión: primero el backend (best-effort), después el estado local.
 *
 * Si el backend falla, el usuario igual queda fuera: dejar una sesión viva por
 * un error de red sería peor que no invalidarla allá.
 */
export async function logout(): Promise<void> {
  const stored = await tokenStorage.getRefresh();

  if (stored !== null) {
    try {
      await sessionApi.logout(stored.token);
    } catch {
      // best-effort: se cierra localmente igual
    }
  }

  handleSessionExpired();
}

/**
 * Renueva el access token.
 *
 * @returns `true` si quedó un token utilizable.
 *
 * @remarks
 * Un fallo de red **no** destruye la sesión (fail-open, igual que el origen):
 * solo un `401`/`418` del endpoint de refresh significa que el token ya no sirve.
 */
export async function refreshSession(): Promise<boolean> {
  const stored = await tokenStorage.getRefresh();

  if (stored === null) {
    return false;
  }

  try {
    const tokens = await sessionApi.refresh(stored.token);
    tokenStorage.setAccessToken(tokens.accessToken, tokens.expiresIn);
    return true;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 418)) {
      handleSessionExpired();
    }

    return false;
  }
}

/**
 * Restaura la sesión al arrancar (F5, nueva pestaña).
 *
 * Sin access token en memoria, el único camino es renovar con el refresh
 * guardado y volver a pedir la identidad.
 */
export async function restoreSession(): Promise<void> {
  const session = useSessionStore.getState();

  if (!tokenStorage.hasRefreshToken()) {
    session.setAnonymous();
    return;
  }

  const renewed = await refreshSession();
  if (!renewed) {
    session.setAnonymous();
    return;
  }

  try {
    const identity = await sessionApi.currentUser();
    session.setSession(identity.user, identity.permissions);
  } catch {
    tokenStorage.clear();
    session.setAnonymous();
  }
}

/**
 * Barrera idempotente de arranque.
 *
 * La consumen todos los `loader` de ruta: React Router los ejecuta en paralelo,
 * así que la primera llamada dispara la restauración y las demás esperan la
 * misma promesa. Sin esto, un F5 podría evaluar permisos vacíos y expulsar al
 * usuario a `/login` estando autenticado.
 */
export function ensureSessionReady(): Promise<void> {
  // Una sesión ya cargada no se vuelve a restaurar: evita pisar el estado
  // cuando un guard corre después de un login en la misma sesión de navegador.
  if (useSessionStore.getState().status === 'authenticated') {
    return Promise.resolve();
  }

  restorePromise ??= restoreSession().catch(() => {
    useSessionStore.getState().setAnonymous();
  });

  return restorePromise;
}

/**
 * Conecta la sesión con el cliente HTTP y con el router.
 *
 * Se llama una sola vez en el arranque (`main.tsx`).
 */
export function installAuth(options: { onSessionExpired: () => void }): void {
  setSessionExpiryHandler(options.onSessionExpired);

  setAuthProvider({
    getAccessToken: () => tokenStorage.getAccessToken(),
    refresh: refreshSession,
    onSessionExpired: handleSessionExpired
  });
}

/** Solo para pruebas: permite volver a arrancar la restauración. */
export function resetSessionBootstrap(): void {
  restorePromise = null;
  sessionExpiryHandler = null;
  tokenStorage.clear();
  useSessionStore.getState().setAnonymous();
}
