import { describe, expect, it } from 'vitest';

import { computeCountryMetrics, formatShare, topInitials, type DashboardCountry } from './metrics';

const countries: readonly DashboardCountry[] = [
  { code: 'CU', name: 'Cuba', active: true },
  { code: 'ES', name: 'España', active: true },
  { code: 'MX', name: 'México', active: false },
  { code: 'AR', name: 'Argentina', active: true }
];

describe('computeCountryMetrics', () => {
  it('cuenta totales y proporción de activos', () => {
    const metrics = computeCountryMetrics(countries);

    expect(metrics.total).toBe(4);
    expect(metrics.active).toBe(3);
    expect(metrics.inactive).toBe(1);
    expect(metrics.activeShare).toBeCloseTo(0.75);
  });

  it('no divide por cero con el catálogo vacío', () => {
    const metrics = computeCountryMetrics([]);

    expect(metrics).toEqual({ total: 0, active: 0, inactive: 0, activeShare: 0, initials: [] });
  });

  it('agrupa por letra inicial ignorando acentos y ordena alfabéticamente', () => {
    const metrics = computeCountryMetrics([
      { code: 'ES', name: 'España', active: true },
      { code: 'EC', name: 'Ecuador', active: true },
      { code: 'AR', name: 'Argentina', active: true }
    ]);

    expect(metrics.initials).toEqual([
      { letter: 'A', count: 1 },
      { letter: 'E', count: 2 }
    ]);
  });

  it('agrupa bajo `#` los nombres que no empiezan por letra', () => {
    const metrics = computeCountryMetrics([{ code: 'ZZ', name: '123 Isla', active: true }]);

    expect(metrics.initials).toEqual([{ letter: '#', count: 1 }]);
  });
});

describe('formatShare', () => {
  it('redondea al entero y añade el símbolo', () => {
    expect(formatShare(0.751)).toBe('75 %');
    expect(formatShare(0)).toBe('0 %');
    expect(formatShare(1)).toBe('100 %');
  });
});

describe('topInitials', () => {
  it('devuelve las letras con más países, de mayor a menor', () => {
    const metrics = computeCountryMetrics([
      { code: 'AA', name: 'Argentina', active: true },
      { code: 'BB', name: 'Brasil', active: true },
      { code: 'CC', name: 'Chile', active: true },
      { code: 'DD', name: 'Cuba', active: true },
      { code: 'EE', name: 'Ecuador', active: true },
      { code: 'FF', name: 'Egipto', active: true }
    ]);

    const top = topInitials(metrics, 2);

    // C (Chile, Cuba) y E (Ecuador, Egipto) empatan a 2; el desempate es alfabético.
    expect(top).toEqual([
      { letter: 'C', count: 2 },
      { letter: 'E', count: 2 }
    ]);
  });

  it('no falla si se piden más letras de las que hay', () => {
    const metrics = computeCountryMetrics([{ code: 'CU', name: 'Cuba', active: true }]);

    expect(topInitials(metrics, 8)).toHaveLength(1);
  });
});
