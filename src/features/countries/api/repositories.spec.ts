import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '@/core/config/env';
import { server } from '@/mocks/server';

import { countriesRepository } from './repositories';

const API = env.apiBaseUrl;

const emptyPage = {
  objects: [{ code: 'CU', name: 'Cuba', active: true, isUnitedState: false }],
  meta: { currentPage: 1, nextPage: null, prevPage: null, totalPage: 1, totalCount: 1 }
};

describe('countriesRepository', () => {
  it('pide el catálogo completo con el tamaño de página del contrato', async () => {
    const captured: URL[] = [];

    server.use(
      http.get(`${API}/api/country/all`, ({ request }) => {
        captured.push(new URL(request.url));
        return HttpResponse.json(emptyPage);
      })
    );

    const catalog = await countriesRepository.getCatalog();

    const url = captured[0];

    expect(url?.searchParams.get('Pag.PageSize')).toBe('250');
    expect(url?.searchParams.get('Pag.Page')).toBe('1');
    // El cliente no debe enviar Search vacío: el backend responde 400.
    expect(url?.searchParams.has('Search.SearchText')).toBe(false);
    expect(catalog.countries).toEqual([{ code: 'CU', name: 'Cuba', active: true }]);
    expect(catalog.totalCount).toBe(1);
  });

  it('lanza si la respuesta no cumple el contrato', async () => {
    server.use(http.get(`${API}/api/country/all`, () => HttpResponse.json({ objects: 'nope' })));

    await expect(countriesRepository.getCatalog()).rejects.toThrow(/respuesta inesperada/i);
  });

  it('activa con PUT /api/country/activate/{code}', async () => {
    let method = '';
    let path = '';

    server.use(
      http.put(`${API}/api/country/activate/:code`, ({ request, params }) => {
        method = request.method;
        path = `/api/country/activate/${String(params['code'])}`;
        return new HttpResponse(null, { status: 200 });
      })
    );

    await countriesRepository.setActive('CU', true);

    expect(method).toBe('PUT');
    expect(path).toBe('/api/country/activate/CU');
  });

  it('desactiva con DELETE /api/country/{code}', async () => {
    let method = '';
    let path = '';

    server.use(
      http.delete(`${API}/api/country/:code`, ({ request, params }) => {
        method = request.method;
        path = `/api/country/${String(params['code'])}`;
        return new HttpResponse(null, { status: 200 });
      })
    );

    await countriesRepository.setActive('CU', false);

    expect(method).toBe('DELETE');
    expect(path).toBe('/api/country/CU');
  });

  it('crea con POST y normaliza el código', async () => {
    let body: unknown = null;

    server.use(
      http.post(`${API}/api/country`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ code: 'CU', name: 'Cuba', active: true });
      })
    );

    const created = await countriesRepository.create({ code: ' cu ', name: 'Cuba' });

    expect(body).toEqual({ code: 'CU', name: 'Cuba' });
    expect(created.code).toBe('CU');
  });
});
