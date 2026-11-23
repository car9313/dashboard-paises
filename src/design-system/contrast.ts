/**
 * Contraste WCAG 2.1 calculado sobre los tokens reales.
 *
 * Es la parte que no se puede «mirar a ojo»: un color puede parecer legible y
 * no llegar a 4.5:1. Vive en el código para que el catálogo y las pruebas usen
 * la misma fórmula que la especificación.
 */

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Acepta `#rgb`, `#rrggbb` y `#rrggbbaa` (el alfa se ignora: se compara el color base). */
export function parseHexColor(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, '');

  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(hex)) {
    return null;
  }

  const expanded =
    hex.length === 3
      ? hex
          .split('')
          .map((character) => character + character)
          .join('')
      : hex;

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16)
  };
}

/** Luminancia relativa según WCAG 2.1 (canales linealizados). */
export function relativeLuminance(color: Rgb): number {
  const linear = (channel: number): number => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

/** Proporción de contraste entre dos colores (1 a 21). `null` si alguno no es hex. */
export function contrastRatio(foreground: string, background: string): number | null {
  const front = parseHexColor(foreground);
  const back = parseHexColor(background);

  if (front === null || back === null) {
    return null;
  }

  const light = relativeLuminance(front);
  const dark = relativeLuminance(back);
  const lighter = Math.max(light, dark);
  const darker = Math.min(light, dark);

  return (lighter + 0.05) / (darker + 0.05);
}

/** Redondeo estable para mensajes y para el catálogo. */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

/** Umbral AA para texto normal (WCAG 2.1, 1.4.3). */
export const AA_TEXT = 4.5;
/** Umbral AA para texto grande e iconos (WCAG 2.1, 1.4.11). */
export const AA_LARGE = 3;
