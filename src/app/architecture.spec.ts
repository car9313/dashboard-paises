import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Test de arquitectura.
 *
 * Hace cumplir `docs/02-arquitectura.md` §4 sin depender de un plugin de ESLint:
 * recorre los archivos, resuelve cada import y falla si cruza una capa
 * prohibida. Es determinista, no necesita configuración y también cubre la
 * regla que un plugin de capas no expresa: **una feature no importa otra**.
 */

const SRC = resolve(process.cwd(), 'src');

type Layer = 'app' | 'feature' | 'core' | 'shared' | 'design-system' | 'mocks' | 'other';

interface Element {
  readonly layer: Layer;
  readonly feature: string | null;
  /** `true` si el archivo es la superficie pública de una feature (`features/<x>`). */
  readonly isFeatureEntry: boolean;
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }

    return /\.(ts|tsx)$/.test(entry.name) && !/\.spec\.(ts|tsx)$/.test(entry.name)
      ? [fullPath]
      : [];
  });
}

/** Rutas relativas a `src`, siempre con `/` como separador. */
function srcPath(absolutePath: string): string {
  return relative(SRC, absolutePath).split(sep).join('/');
}

function classify(absolutePath: string): Element {
  const parts = srcPath(absolutePath).split('/');
  const first = parts[0];

  // El punto de entrada ES la capa `app`: compone rutas y providers.
  if (first === 'app' || first === 'main.tsx') {
    return { layer: 'app', feature: null, isFeatureEntry: false };
  }
  if (first === 'core') return { layer: 'core', feature: null, isFeatureEntry: false };
  if (first === 'shared') return { layer: 'shared', feature: null, isFeatureEntry: false };
  if (first === 'design-system') {
    return { layer: 'design-system', feature: null, isFeatureEntry: false };
  }
  if (first === 'mocks') return { layer: 'mocks', feature: null, isFeatureEntry: false };
  if (first === 'features') {
    // `features/<x>` sin subruta = superficie pública (index.ts) de la feature.
    return { layer: 'feature', feature: parts[1] ?? null, isFeatureEntry: parts.length === 2 };
  }

  return { layer: 'other', feature: null, isFeatureEntry: false };
}

function importedSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined)
    .filter((specifier) => specifier.startsWith('@/') || specifier.startsWith('.'));
}

function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith('@/')) {
    return resolve(SRC, specifier.slice(2));
  }

  if (specifier.startsWith('.')) {
    return resolve(dirname(fromFile), specifier);
  }

  return null;
}

/** Reglas de dependencia entre capas. `null` = permitido. */
function violationOf(from: Element, to: Element): string | null {
  if (from.layer === 'app') return null;

  if (to.layer === 'app') {
    return 'solo `app/` puede importar de `app/`';
  }

  /*
   * Entre features solo se permite la **superficie pública** (`features/<x>`),
   * nunca una subruta: lo que hay que evitar es el acoplamiento a internals, no
   * el uso de un contrato publicado (ADR-020). `users` consume el catálogo de
   * `roles` por esta puerta y nada más.
   */
  if (from.layer === 'feature' && to.layer === 'feature' && from.feature !== to.feature) {
    if (!to.isFeatureEntry) {
      return `la feature "${String(from.feature)}" solo puede importar la superficie pública de "${String(to.feature)}" (features/${String(to.feature)})`;
    }
  }

  if (from.layer === 'core' && (to.layer === 'feature' || to.layer === 'design-system')) {
    return '`core/` no puede depender de features ni del sistema de diseño';
  }

  if (from.layer === 'shared' && (to.layer === 'feature' || to.layer === 'design-system')) {
    return '`shared/` no puede depender de features ni del sistema de diseño';
  }

  if (from.layer === 'design-system' && (to.layer === 'feature' || to.layer === 'core')) {
    return 'el sistema de diseño no puede depender de features ni de `core/`';
  }

  if (from.layer === 'mocks' && to.layer === 'feature') {
    return '`mocks/` solo puede depender de `core/` y de sí mismo';
  }

  return null;
}

describe('arquitectura', () => {
  it('respeta las reglas de dependencia entre capas y features', () => {
    const violations: string[] = [];

    for (const file of listSourceFiles(SRC)) {
      const from = classify(file);
      const source = readFileSync(file, 'utf8');

      for (const specifier of importedSpecifiers(source)) {
        const resolved = resolveSpecifier(file, specifier);
        if (resolved === null || !resolved.startsWith(SRC)) {
          continue;
        }

        const reason = violationOf(from, classify(resolved));
        if (reason !== null) {
          violations.push(`${srcPath(file)} → ${specifier}: ${reason}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('no deja que un componente llame a `fetch` directamente', () => {
    const offenders = listSourceFiles(SRC)
      .filter((file) => classify(file).layer !== 'core' && classify(file).layer !== 'mocks')
      .filter((file) => /\bfetch\s*\(/.test(readFileSync(file, 'utf8')))
      .map(srcPath);

    expect(offenders).toEqual([]);
  });
});
