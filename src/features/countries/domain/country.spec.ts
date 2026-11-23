import { describe, expect, it } from 'vitest';

import type { Country, CountryCatalog } from './country';
import { patchCountry, patchCountryActive } from './country';

const catalog: CountryCatalog = {
  countries: [
    { code: 'CU', name: 'Cuba', active: true },
    { code: 'ES', name: 'España', active: true }
  ],
  totalCount: 2
};

describe('patchCountryActive', () => {
  it('cambia solo la fila indicada', () => {
    const next = patchCountryActive(catalog, 'CU', false);

    expect(next.countries).toEqual([
      { code: 'CU', name: 'Cuba', active: false },
      { code: 'ES', name: 'España', active: true }
    ]);
    expect(next.totalCount).toBe(2);
  });

  it('no muta el catálogo original (TanStack compara referencias)', () => {
    const next = patchCountryActive(catalog, 'CU', false);

    expect(next).not.toBe(catalog);
    expect(catalog.countries[0]?.active).toBe(true);
  });

  it('devuelve un catálogo equivalente si el código no existe', () => {
    const next = patchCountryActive(catalog, 'XX', false);

    expect(next.countries).toEqual(catalog.countries);
  });
});

describe('patchCountry', () => {
  it('sustituye la fila por la versión actualizada', () => {
    const updated: Country = { code: 'ES', name: 'Reino de España', active: true };

    const next = patchCountry(catalog, updated);

    expect(next.countries[1]).toEqual(updated);
    expect(next.countries[0]).toEqual(catalog.countries[0]);
  });
});
