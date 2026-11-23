import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { env } from '@/core/config/env';
import { queryKeys } from '@/core/query/keys';
import { server } from '@/mocks/server';
import { createTestQueryClient } from '@/test-utils/render';

import type { CountryCatalog } from '../domain/country';
import { CountryDetailDialog } from './CountryDetailDialog';

const API = env.apiBaseUrl;

const catalog: CountryCatalog = {
  countries: [
    { code: 'CU', name: 'Cuba', active: true },
    { code: 'ES', name: 'España', active: false }
  ],
  totalCount: 2
};

function renderDialog(code: string, cached: CountryCatalog | undefined = catalog) {
  const client = createTestQueryClient();

  if (cached !== undefined) {
    client.setQueryData(queryKeys.countries.catalog(), cached);
  }

  render(
    <QueryClientProvider client={client}>
      <CountryDetailDialog code={code} onClose={vi.fn()} />
    </QueryClientProvider>
  );

  return client;
}

describe('CountryDetailDialog', () => {
  it('sirve el detalle desde el catálogo en caché sin pedir el endpoint', async () => {
    let detailCalls = 0;

    server.use(
      http.get(`${API}/api/country/:code`, ({ params }) => {
        if (params['code'] === 'all') return undefined;
        detailCalls += 1;
        return HttpResponse.json({ code: 'CU', name: 'Cuba', active: true });
      })
    );

    renderDialog('CU');

    expect(await screen.findByText('Cuba')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(detailCalls).toBe(0);
  });

  it('consulta el endpoint cuando el código no está en el catálogo', async () => {
    server.use(
      http.get(`${API}/api/country/XX`, () =>
        HttpResponse.json({ code: 'XX', name: 'Pais Remoto', active: false })
      )
    );

    renderDialog('XX');

    expect(await screen.findByText('Pais Remoto')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
  });

  it('muestra error con reintento si el respaldo falla', async () => {
    server.use(
      http.get(`${API}/api/country/XX`, () =>
        HttpResponse.json({ title: 'No encontrado' }, { status: 404 })
      )
    );

    renderDialog('XX');

    await waitFor(() => {
      expect(screen.getByText('No se pudieron cargar los datos')).toBeInTheDocument();
    });
    expect(screen.getByText('No encontramos lo que buscabas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });

  it('ofrece editar solo si se pasa el manejador', async () => {
    const { rerender } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <CountryDetailDialog code="CU" onClose={vi.fn()} />
      </QueryClientProvider>
    );

    expect(screen.queryByRole('button', { name: /editar/i })).toBeNull();

    const client = createTestQueryClient();
    client.setQueryData(queryKeys.countries.catalog(), catalog);

    rerender(
      <QueryClientProvider client={client}>
        <CountryDetailDialog code="CU" onClose={vi.fn()} onEdit={vi.fn()} />
      </QueryClientProvider>
    );

    expect(await screen.findByRole('button', { name: /editar/i })).toBeInTheDocument();
  });
});
