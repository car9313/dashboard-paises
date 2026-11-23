import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { env } from '@/core/config/env';
import { queryKeys } from '@/core/query/keys';
import { server } from '@/mocks/server';
import { createTestQueryClient } from '@/test-utils/render';

import type { Country, CountryCatalog } from '../domain/country';
import { useToggleCountry } from './mutations';

const API = env.apiBaseUrl;

const cuba: Country = { code: 'CU', name: 'Cuba', active: true };

function setup() {
  const client = createTestQueryClient();

  client.setQueryData<CountryCatalog>(queryKeys.countries.catalog(), {
    countries: [cuba, { code: 'ES', name: 'España', active: true }],
    totalCount: 2
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  const { result } = renderHook(() => useToggleCountry(), { wrapper });

  const activeOf = (code: string): boolean | undefined =>
    client
      .getQueryData<CountryCatalog>(queryKeys.countries.catalog())
      ?.countries.find((country) => country.code === code)?.active;

  return { client, result, activeOf };
}

describe('useToggleCountry', () => {
  it('aplica el cambio de forma optimista antes de que responda el servidor', async () => {
    server.use(
      http.delete(`${API}/api/country/:code`, () => new HttpResponse(null, { status: 200 }))
    );

    const { result, activeOf } = setup();

    act(() => {
      result.current.mutate({ country: cuba, active: false });
    });

    // El optimismo se ve antes del asentamiento.
    await waitFor(() => {
      expect(activeOf('CU')).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('restaura el estado anterior si el backend falla', async () => {
    server.use(
      http.delete(`${API}/api/country/:code`, () =>
        HttpResponse.json({ title: 'Fallo' }, { status: 500 })
      )
    );

    const { result, activeOf } = setup();

    act(() => {
      result.current.mutate({ country: cuba, active: false });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(activeOf('CU')).toBe(true);
  });

  it('no toca las demás filas', async () => {
    server.use(
      http.delete(`${API}/api/country/:code`, () => new HttpResponse(null, { status: 200 }))
    );

    const { result, activeOf } = setup();

    act(() => {
      result.current.mutate({ country: cuba, active: false });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(activeOf('ES')).toBe(true);
  });

  it('expone la fila en vuelo mediante las variables', async () => {
    server.use(
      http.delete(`${API}/api/country/:code`, async () => {
        // 250 ms, no 30: el test observa isPending, un estado transitorio.
        // Con 30 ms la mutación podía resolverse antes de que el observer lo
        // viera y waitFor esperaba un estado que ya había pasado.
        await new Promise((resolve) => setTimeout(resolve, 250));
        return new HttpResponse(null, { status: 200 });
      })
    );

    const { result } = setup();

    act(() => {
      result.current.mutate({ country: cuba, active: false });
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    expect(result.current.variables?.country.code).toBe('CU');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });
});
