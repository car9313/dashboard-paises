import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SIZE, type QueryParams } from './types';
import { buildQueryParams, toSearchParams } from './params';

function query(overrides: Partial<QueryParams> = {}): QueryParams {
  return {
    search: { SearchText: '', Strict: false },
    filter: [],
    sort: [],
    pag: { Page: 1, PageSize: DEFAULT_PAGE_SIZE },
    ...overrides
  };
}

describe('buildQueryParams', () => {
  it('omite Search cuando el texto está vacío', () => {
    const params = buildQueryParams(query());

    expect(params.has('Search.SearchText')).toBe(false);
    expect(params.has('Search.Strict')).toBe(false);
    expect(params.get('Pag.Page')).toBe('1');
    expect(params.get('Pag.PageSize')).toBe('10');
  });

  it('recorta el texto de búsqueda y envía Strict', () => {
    const params = buildQueryParams(query({ search: { SearchText: '  cub  ', Strict: true } }));

    expect(params.get('Search.SearchText')).toBe('cub');
    expect(params.get('Search.Strict')).toBe('true');
  });

  it('serializa Filter y Sort como JSON en un único parámetro', () => {
    const params = buildQueryParams(
      query({
        filter: [{ PropertyName: 'active', PropertyValue: 'false' }],
        sort: [{ SortBy: 'name', Ascending: false }]
      })
    );

    expect(JSON.parse(params.get('Filter') ?? '[]')).toEqual([
      { PropertyName: 'active', PropertyValue: 'false' }
    ]);
    expect(JSON.parse(params.get('Sort') ?? '[]')).toEqual([{ SortBy: 'name', Ascending: false }]);
    // El formato `Sort[0].SortBy` NO lo bindea el backend.
    expect(params.has('Sort[0].SortBy')).toBe(false);
  });

  it('no incluye Filter ni Sort cuando están vacíos', () => {
    const params = buildQueryParams(query());

    expect(params.has('Filter')).toBe(false);
    expect(params.has('Sort')).toBe(false);
  });
});

describe('toSearchParams', () => {
  it('omite undefined, null y cadena vacía', () => {
    const params = toSearchParams({
      'Pag.Page': 2,
      'Pag.PageSize': 25,
      q: '',
      cursor: undefined,
      filter: null
    });

    expect(params.toString()).toBe('Pag.Page=2&Pag.PageSize=25');
  });

  it('convierte booleanos y números a texto', () => {
    const params = toSearchParams({ strict: true, page: 3 });

    expect(params.get('strict')).toBe('true');
    expect(params.get('page')).toBe('3');
  });
});
