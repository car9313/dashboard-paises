import { describe, expect, it } from 'vitest';

import { loginUrlFor, resolveRedirectTarget } from './redirect-target';

describe('resolveRedirectTarget', () => {
  it('devuelve el inicio cuando no hay destino', () => {
    expect(resolveRedirectTarget(null)).toBe('/');
  });

  it('acepta una ruta interna', () => {
    expect(resolveRedirectTarget('/nomencladores/paises?page=2')).toBe(
      '/nomencladores/paises?page=2'
    );
  });

  it('rechaza una URL absoluta', () => {
    expect(resolveRedirectTarget('https://evil.example/steal')).toBe('/');
  });

  it('rechaza una URL protocol-relative', () => {
    expect(resolveRedirectTarget('//evil.example/steal')).toBe('/');
  });

  it('rechaza el truco de barra invertida', () => {
    expect(resolveRedirectTarget('/\\evil.example')).toBe('/');
  });
});

describe('loginUrlFor', () => {
  it('codifica el destino para no romper el query string', () => {
    expect(loginUrlFor('/nomencladores/paises', '?page=2')).toBe(
      '/login?redirect=%2Fnomencladores%2Fpaises%3Fpage%3D2'
    );
  });
});
