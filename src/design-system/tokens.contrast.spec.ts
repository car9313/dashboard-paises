import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { AA_LARGE, AA_TEXT, contrastRatio, formatRatio } from './contrast';

/**
 * Auditoría de contraste de los tokens reales.
 *
 * Lee `tokens.css` (no una copia en TypeScript) para que el test falle si alguien
 * cambia un color y rompe la legibilidad. Se ejecuta en milisegundos y no
 * necesita navegador.
 */

const css = readFileSync(join(process.cwd(), 'src', 'design-system', 'tokens.css'), 'utf8');

function readBlock(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  const tokens: Record<string, string> = {};

  if (match?.[1] === undefined) {
    return tokens;
  }

  // Los comentarios de sección van pegados a la primera declaración del bloque.
  const withoutComments = match[1].replace(/\/\*[\s\S]*?\*\//g, '');

  for (const declaration of withoutComments.split(';')) {
    const [name, value] = declaration.split(':');

    if (name?.trim().startsWith('--') === true && value !== undefined) {
      tokens[name.trim()] = value.trim();
    }
  }

  return tokens;
}

const light = readBlock(':root');
const dark = { ...light, ...readBlock('html.dark') };

interface Pair {
  readonly label: string;
  readonly fg: string;
  readonly bg: string;
}

/** Combinaciones que la interfaz usa de verdad como texto. */
const TEXT_PAIRS: readonly Pair[] = [
  { label: 'texto principal sobre fondo', fg: '--foreground', bg: '--background' },
  { label: 'texto principal sobre tarjeta', fg: '--foreground', bg: '--card' },
  { label: 'texto secundario sobre tarjeta', fg: '--muted-foreground', bg: '--card' },
  { label: 'texto tenue sobre tarjeta', fg: '--subtle-foreground', bg: '--card' },
  { label: 'texto sobre la marca', fg: '--primary-foreground', bg: '--primary' },
  { label: 'insignia de marca', fg: '--primary-soft-foreground', bg: '--primary-soft' },
  { label: 'insignia de éxito', fg: '--success', bg: '--success-soft' },
  { label: 'insignia de advertencia', fg: '--warning', bg: '--warning-soft' },
  { label: 'insignia de peligro', fg: '--danger', bg: '--danger-soft' },
  { label: 'insignia informativa', fg: '--info', bg: '--info-soft' },
  { label: 'error sobre tarjeta', fg: '--danger', bg: '--card' }
];

const UI_PAIRS: readonly Pair[] = [
  { label: 'anillo de foco sobre fondo', fg: '--ring', bg: '--background' },
  { label: 'anillo de foco sobre tarjeta', fg: '--ring', bg: '--card' },
  { label: 'borde fuerte sobre tarjeta', fg: '--border-strong', bg: '--card' }
];

describe.each([
  ['tema claro', light],
  ['tema oscuro', dark]
])('contraste AA · %s', (_theme, tokens) => {
  it.each(TEXT_PAIRS)('$label alcanza AA', ({ label, fg, bg }) => {
    const foreground = tokens[fg];
    const background = tokens[bg];

    expect(foreground, `token ${fg} no definido`).toBeDefined();
    expect(background, `token ${bg} no definido`).toBeDefined();

    const ratio = contrastRatio(foreground ?? '', background ?? '');

    expect(ratio, `${label}: ${fg} sobre ${bg} no es un color hex`).not.toBeNull();
    expect(ratio ?? 0, `${label} → ${formatRatio(ratio ?? 0)}`).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
describe.each([
  ['tema claro', light],
  ['tema oscuro', dark]
])('contraste de interfaz · %s', (_theme, tokens) => {
  it.each(UI_PAIRS)('$label alcanza 3:1', ({ label, fg, bg }) => {
    const ratio = contrastRatio(tokens[fg] ?? '', tokens[bg] ?? '');

    expect(ratio, `${label}: ${fg} sobre ${bg} no es un color hex`).not.toBeNull();
    expect(ratio ?? 0, `${label} → ${formatRatio(ratio ?? 0)}`).toBeGreaterThanOrEqual(AA_LARGE);
  });
});
