import { env } from '@/core/config/env';

import { toApiError } from './problems';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Puente entre la capa HTTP y la sesión.
 *
 * Se registra en el arranque (`core/auth`) para que `client` no dependa de
 * `core/auth` y no haya ciclos. En pruebas se sustituye por un doble.
 */
export interface AuthProvider {
  /** Token vigente, o `null` si no hay sesión. */
  getAccessToken(): string | null;
  /** Renueva la sesión. `true` si el token quedó utilizable. */
  refresh(): Promise<boolean>;
  /** Notifica que la sesión terminó y la UI debe salir. */
  onSessionExpired(): void;
}

export interface RequestOptions {
  readonly method?: HttpMethod;
  readonly body?: unknown;
  readonly query?: URLSearchParams;
  readonly signal?: AbortSignal;
  readonly headers?: Record<string, string>;
  /**
   * Omite el `Bearer` y la renovación automática.
   *
   * Obligatorio en `login` y `refresh-token`: si esas peticiones pasaran por el
   * flujo de 401, un refresh rechazado dispararía otro refresh en bucle.
   */
  readonly skipAuth?: boolean;
}

let authProvider: AuthProvider | null = null;

/**
 * Única promesa de renovación compartida.
 *
 * Sin esto, cinco peticiones que reciben 401 a la vez dispararían cinco
 * refresh y el backend invalidaría la sesión con el segundo (regla de sesión
 * única por huella). Es el equivalente de la «cola única» del interceptor del
 * proyecto origen.
 */
let refreshInFlight: Promise<boolean> | null = null;

export function setAuthProvider(next: AuthProvider | null): void {
  authProvider = next;
  refreshInFlight = null;
}

/** Expuesto para pruebas: permite limpiar el estado compartido entre casos. */
export function resetHttpState(): void {
  authProvider = null;
  refreshInFlight = null;
}

async function refreshOnce(): Promise<boolean> {
  if (!authProvider) {
    return false;
  }

  refreshInFlight ??= authProvider.refresh().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

function buildUrl(path: string, query: URLSearchParams | undefined): string {
  const url = `${env.apiBaseUrl}${path}`;
  return query && query.size > 0 ? `${url}?${query.toString()}` : url;
}

interface SendResult {
  readonly response: Response;
  /** Token con el que se firmó la petición (para detectar renovaciones ajenas). */
  readonly tokenUsed: string | null;
}

async function send(path: string, options: RequestOptions): Promise<SendResult> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const tokenUsed = options.skipAuth === true ? null : (authProvider?.getAccessToken() ?? null);
  if (tokenUsed !== null) {
    headers['Authorization'] = `Bearer ${tokenUsed}`;
  }

  try {
    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers,
      signal: options.signal ?? null,
      credentials: 'omit'
    };

    if (options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(buildUrl(path, options.query), init);
    return { response, tokenUsed };
  } catch (error) {
    // Abortar no es un fallo: se propaga tal cual para que TanStack Query
    // distinga una cancelación de un error de red.
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw toApiError(0, { detail: 'No se pudo conectar con el servidor.' });
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Ejecuta una petición y devuelve el cuerpo parseado.
 *
 * Contrato de errores: cualquier estado no 2xx lanza `ApiError`. Un 401 se
 * reintenta **una sola vez** tras renovar la sesión (`retried` evita bucles si
 * el token renovado también es rechazado).
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return execute<T>(path, options, false);
}

async function execute<T>(path: string, options: RequestOptions, retried: boolean): Promise<T> {
  const { response, tokenUsed } = await send(path, options);

  if (response.status === 401 && !retried && options.skipAuth !== true && authProvider !== null) {
    /*
     * Si otro consumidor ya renovó la sesión mientras esta petición estaba en
     * vuelo, el token actual difiere del que usamos: se reintenta sin disparar
     * otra renovación. Sin esta comprobación, tres 401 que llegan en momentos
     * distintos producen tres refresh y el backend invalida la sesión.
     */
    const alreadyRenewed = authProvider.getAccessToken() !== tokenUsed;
    const renewed = alreadyRenewed ? true : await refreshOnce().catch(() => false);

    if (renewed) {
      return execute<T>(path, options, true);
    }
  }

  if (response.status === 418) {
    authProvider?.onSessionExpired();
  }

  if (!response.ok) {
    throw toApiError(response.status, await readBody(response));
  }

  const body = await readBody(response);
  return body as T;
}

/** Igual que `request` pero para endpoints sin cuerpo (204/void). */
export async function requestVoid(path: string, options: RequestOptions = {}): Promise<void> {
  await request<undefined>(path, options);
}

export const http = {
  get: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(path: string, body: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'PUT', body }),

  delete: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),

  /** Acciones de estado sin cuerpo de respuesta. */
  action: (method: HttpMethod, path: string, body?: unknown) => requestVoid(path, { method, body })
};
