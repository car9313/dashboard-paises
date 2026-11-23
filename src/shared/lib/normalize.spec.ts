import { describe, expect, it } from 'vitest';

import { includesNormalized, normalizeText } from './normalize';

describe('normalizeText', () => {
  it('quita acentos y pasa a minúsculas', () => {
    expect(normalizeText('España')).toBe('espana');
    expect(normalizeText('BRASIL')).toBe('brasil');
  });

  it('recorta espacios de los extremos', () => {
    expect(normalizeText('  Cuba  ')).toBe('cuba');
  });

  it('no rompe con texto vacío', () => {
    expect(normalizeText('')).toBe('');
  });
});

describe('includesNormalized', () => {
  it('encuentra sin acentos ni mayúsculas', () => {
    expect(includesNormalized('España', 'espana')).toBe(true);
    expect(includesNormalized('Cuba', 'CU')).toBe(true);
  });

  it('una búsqueda vacía coincide con todo', () => {
    expect(includesNormalized('Cuba', '')).toBe(true);
    expect(includesNormalized('Cuba', '   ')).toBe(true);
  });

  it('no coincide cuando no está', () => {
    expect(includesNormalized('Cuba', 'chile')).toBe(false);
  });
});
