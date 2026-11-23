import { normalizeText } from '@/shared/lib/normalize';

/**
 * Métricas del nomenclador.
 *
 * Dominio puro: recibe una lista mínima (estructuralmente compatible con
 * `Country`) y devuelve números. Sin React, sin red, sin fechas: se prueba en
 * milisegundos y no puede desviarse de lo que muestra la pantalla.
 *
 * @remarks
 * El dashboard **no** añade peticiones: trabaja sobre el catálogo que ya está en
 * caché para la pantalla de Países (ADR-013).
 */

/** Forma mínima que necesita el cálculo; `Country` la cumple. */
export interface DashboardCountry {
  readonly code: string;
  readonly name: string;
  readonly active: boolean;
}

export interface InitialCount {
  /** Letra inicial en mayúsculas, o `#` para el resto. */
  readonly letter: string;
  readonly count: number;
}

export interface CountryMetrics {
  readonly total: number;
  readonly active: number;
  readonly inactive: number;
  /** Proporción de activos entre 0 y 1; 0 si no hay países. */
  readonly activeShare: number;
  /** Países por letra inicial, en orden alfabético. */
  readonly initials: readonly InitialCount[];
}

const OTHER_LETTER = '#';

function initialOf(name: string): string {
  const first = normalizeText(name).charAt(0).toUpperCase();

  return /^[A-Z]$/.test(first) ? first : OTHER_LETTER;
}

export function computeCountryMetrics(countries: readonly DashboardCountry[]): CountryMetrics {
  const total = countries.length;
  const active = countries.filter((country) => country.active).length;
  const inactive = total - active;

  const counts = new Map<string, number>();
  for (const country of countries) {
    const letter = initialOf(country.name);
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }

  const initials = [...counts.entries()]
    .map(([letter, count]) => ({ letter, count }))
    .sort((left, right) => left.letter.localeCompare(right.letter, 'es'));

  return {
    total,
    active,
    inactive,
    activeShare: total === 0 ? 0 : active / total,
    initials
  };
}

/** Formatea una proporción 0..1 como porcentaje entero («98 %»). */
export function formatShare(share: number): string {
  return `${String(Math.round(share * 100))} %`;
}

/** Las `limit` letras con más países, de mayor a menor. */
export function topInitials(metrics: CountryMetrics, limit: number): readonly InitialCount[] {
  return [...metrics.initials]
    .sort((left, right) => right.count - left.count || left.letter.localeCompare(right.letter))
    .slice(0, limit);
}
