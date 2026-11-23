/**
 * Normalización de texto para búsquedas y comparaciones.
 *
 * El usuario espera que «espana» encuentre «España» y que «CUBA» encuentre
 * «Cuba». `normalize('NFD')` separa los diacríticos y el regex los elimina;
 * `toLowerCase` unifica mayúsculas. El resultado sirve para comparar, nunca
 * para mostrar.
 */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** `true` si `haystack` contiene `needle` ignorando acentos y mayúsculas. */
export function includesNormalized(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalizeText(needle);

  if (normalizedNeedle.length === 0) {
    return true;
  }

  return normalizeText(haystack).includes(normalizedNeedle);
}
