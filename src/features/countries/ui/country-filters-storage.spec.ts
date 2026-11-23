import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearCountryFilters,
  countryFiltersStorageKey,
  loadCountryFilters,
  saveCountryFilters
} from './country-filters-storage';
import type { CountriesQueryState } from './countries-query-schema';

const state: CountriesQueryState = {
  q: 'cuba',
  status: 'active',
  sort: 'code',
  dir: 'desc',
  page: 3,
  size: 25
};

const OWNER = '1';

/** Escribe un payload crudo en la clave del usuario. */
function writeRaw(ownerId: string, value: string): void {
  sessionStorage.setItem(countryFiltersStorageKey(ownerId), value);
}

describe('country-filters-storage', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('guarda y restaura el estado completo, paginación incluida', () => {
    saveCountryFilters(OWNER, state);

    expect(loadCountryFilters(OWNER)).toEqual(state);
  });

  it('no mezcla usuarios distintos', () => {
    saveCountryFilters('1', state);
    saveCountryFilters('2', { ...state, q: 'espana' });

    expect(loadCountryFilters('1')?.q).toBe('cuba');
    expect(loadCountryFilters('2')?.q).toBe('espana');
    expect(loadCountryFilters('3')).toBeNull();
  });

  it('descarta y borra un payload de otra versión', () => {
    writeRaw(OWNER, JSON.stringify({ version: 99, savedAt: Date.now(), data: state }));

    expect(loadCountryFilters(OWNER)).toBeNull();
    expect(sessionStorage.getItem(countryFiltersStorageKey(OWNER))).toBeNull();
  });

  it('descarta un payload vencido (más de 12 h)', () => {
    writeRaw(
      OWNER,
      JSON.stringify({ version: 1, savedAt: Date.now() - 13 * 60 * 60 * 1000, data: state })
    );

    expect(loadCountryFilters(OWNER)).toBeNull();
  });

  it('descarta sin fallar un JSON corrupto', () => {
    writeRaw(OWNER, '{ esto no es json');

    expect(loadCountryFilters(OWNER)).toBeNull();
  });

  it('descarta un estado con un tamaño de página no permitido', () => {
    writeRaw(
      OWNER,
      JSON.stringify({ version: 1, savedAt: Date.now(), data: { ...state, size: 7 } })
    );

    expect(loadCountryFilters(OWNER)).toBeNull();
  });

  it('descarta un estado con campos de más o de menos', () => {
    writeRaw(OWNER, JSON.stringify({ version: 1, savedAt: Date.now(), data: { q: 'x' } }));
    expect(loadCountryFilters(OWNER)).toBeNull();

    writeRaw(
      OWNER,
      JSON.stringify({ version: 1, savedAt: Date.now(), data: { ...state, extra: true } })
    );
    // Zod ignora claves desconocidas por defecto: el resto es válido.
    expect(loadCountryFilters(OWNER)?.q).toBe('cuba');
  });

  it('limpia de forma explícita', () => {
    saveCountryFilters(OWNER, state);
    clearCountryFilters(OWNER);

    expect(loadCountryFilters(OWNER)).toBeNull();
  });

  it('no lanza si el almacenamiento falla al escribir', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => {
      saveCountryFilters(OWNER, state);
    }).not.toThrow();

    spy.mockRestore();
  });

  it('no lanza si el almacenamiento falla al leer', () => {
    saveCountryFilters(OWNER, state);

    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(loadCountryFilters(OWNER)).toBeNull();

    spy.mockRestore();
  });
});
