import { describe, expect, it } from 'vitest';

import type { Country } from './country';
import { filterCountries, sortCountries } from './country-list';

const countries: readonly Country[] = [
  { code: 'CU', name: 'Cuba', active: true },
  { code: 'ES', name: 'España', active: true },
  { code: 'MX', name: 'México', active: false },
  { code: 'ZA', name: 'Zambia', active: true },
  { code: 'AF', name: 'Afganistán', active: false }
];

describe('filterCountries', () => {
  it('sin filtros devuelve la misma referencia', () => {
    expect(filterCountries(countries, { query: '', status: 'all' })).toBe(countries);
  });

  it('busca por nombre ignorando acentos y mayúsculas', () => {
    const result = filterCountries(countries, { query: 'ESPANA', status: 'all' });

    expect(result.map((country) => country.code)).toEqual(['ES']);
  });

  it('busca también por código', () => {
    const result = filterCountries(countries, { query: 'mx', status: 'all' });

    expect(result.map((country) => country.code)).toEqual(['MX']);
  });

  it('filtra por estado activo', () => {
    const result = filterCountries(countries, { query: '', status: 'active' });

    expect(result.map((country) => country.code)).toEqual(['CU', 'ES', 'ZA']);
  });

  it('filtra por estado inactivo', () => {
    const result = filterCountries(countries, { query: '', status: 'inactive' });

    expect(result.map((country) => country.code)).toEqual(['MX', 'AF']);
  });

  it('combina búsqueda y estado', () => {
    const result = filterCountries(countries, { query: 'a', status: 'inactive' });

    // «México» contiene «i», no «a»: solo Afganistán coincide en ambos.
    expect(result.map((country) => country.code)).toEqual(['AF']);
  });
});

describe('sortCountries', () => {
  it('ordena por nombre ascendente con locale español', () => {
    const result = sortCountries(countries, 'name', 'asc');

    expect(result.map((country) => country.name)).toEqual([
      'Afganistán',
      'Cuba',
      'España',
      'México',
      'Zambia'
    ]);
  });

  it('ordena por nombre descendente', () => {
    const result = sortCountries(countries, 'name', 'desc');

    expect(result[0]?.name).toBe('Zambia');
    expect(result.at(-1)?.name).toBe('Afganistán');
  });

  it('ordena por código', () => {
    const result = sortCountries(countries, 'code', 'asc');

    expect(result.map((country) => country.code)).toEqual(['AF', 'CU', 'ES', 'MX', 'ZA']);
  });

  it('no muta el arreglo original', () => {
    const original = countries.map((country) => country.code);

    sortCountries(countries, 'name', 'desc');

    expect(countries.map((country) => country.code)).toEqual(original);
  });

  it('desempata por código cuando el nombre se repite', () => {
    const duplicated: readonly Country[] = [
      { code: 'ZZ', name: 'Congo', active: true },
      { code: 'AA', name: 'Congo', active: true }
    ];

    expect(sortCountries(duplicated, 'name', 'asc').map((country) => country.code)).toEqual([
      'AA',
      'ZZ'
    ]);
  });
});
