import { HttpResponse, http } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { env } from '@/core/config/env';
import { server } from '@/mocks/server';

import { request, requestVoid, resetHttpState, setAuthProvider, type AuthProvider } from './client';
import { ApiError } from './problems';

const API = env.apiBaseUrl;

describe('cliente HTTP', () => {
  let token: string;
  let refresh: Mock<() => Promise<boolean>>;
  let onSessionExpired: Mock<() => void>;

  beforeEach(() => {
    token = 'stale';
    refresh = vi.fn<() => Promise<boolean>>(async () => {
      token = 'fresh';
      return true;
    });
    onSessionExpired = vi.fn<() => void>();

    resetHttpState();
    const provider: AuthProvider = {
      getAccessToken: () => token,
      refresh,
      onSessionExpired
    };
    setAuthProvider(provider);
  });

  afterEach(() => {
    resetHttpState();
  });

  it('devuelve el cuerpo parseado y adjunta el Bearer', async () => {
    let received: string | null = null;

    server.use(
      http.get(`${API}/api/private`, ({ request: incoming }) => {
        received = incoming.headers.get('Authorization');
        return HttpResponse.json({ value: 42 });
      })
    );

    const body = await request<{ value: number }>('/api/private');

    expect(body).toEqual({ value: 42 });
    expect(received).toBe('Bearer stale');
  });

  it('renueva la sesión y reintenta una vez tras un 401', async () => {
    let calls = 0;

    server.use(
      http.get(`${API}/api/private`, ({ request: incoming }) => {
        calls += 1;
        return incoming.headers.get('Authorization') === 'Bearer fresh'
          ? HttpResponse.json({ ok: true })
          : new HttpResponse(null, { status: 401 });
      })
    );

    await expect(request<{ ok: boolean }>('/api/private')).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toBe(2);
  });

  it('comparte una sola renovación entre peticiones concurrentes', async () => {
    server.use(
      http.get(`${API}/api/private`, ({ request: incoming }) =>
        incoming.headers.get('Authorization') === 'Bearer fresh'
          ? HttpResponse.json({ ok: true })
          : new HttpResponse(null, { status: 401 })
      )
    );

    await Promise.all([request('/api/private'), request('/api/private'), request('/api/private')]);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('no entra en bucle si el token renovado también es rechazado', async () => {
    server.use(http.get(`${API}/api/private`, () => new HttpResponse(null, { status: 401 })));

    await expect(request('/api/private')).rejects.toBeInstanceOf(ApiError);
    // Un intento inicial + un reintento; nunca más.
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('cierra la sesión y lanza error tipado ante un 418', async () => {
    server.use(http.get(`${API}/api/private`, () => new HttpResponse(null, { status: 418 })));

    const error = await request('/api/private').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('sessionExpired');
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('propaga el detalle y el traceId de un ProblemDetails', async () => {
    server.use(
      http.get(`${API}/api/private`, () =>
        HttpResponse.json(
          {
            title: 'No encontrado',
            status: 404,
            detail: 'El país no existe.',
            traceId: '00-trace'
          },
          { status: 404 }
        )
      )
    );

    const error = await request('/api/private').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
    expect((error as ApiError).detail).toBe('El país no existe.');
    expect((error as ApiError).traceId).toBe('00-trace');
  });

  it('resuelve sin cuerpo en un 204', async () => {
    server.use(http.delete(`${API}/api/private`, () => new HttpResponse(null, { status: 204 })));

    await expect(requestVoid('/api/private', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('convierte un fallo de red en un error no disponible', async () => {
    server.use(http.get(`${API}/api/private`, () => HttpResponse.error()));

    const error = await request('/api/private').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('unavailable');
  });
});
