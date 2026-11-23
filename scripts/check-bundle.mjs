#!/usr/bin/env node
/**
 * Presupuesto de arranque medido en gzip.
 *
 * El límite de Vite es en bytes crudos y avisa por chunk suelto, lo que no dice
 * nada sobre lo que descarga el usuario. Este script sigue el grafo real de
 * `index.html` —entrada + sus `import` estáticos— y suma el gzip de todo lo que
 * se pide antes de pintar.
 *
 * Uso: `pnpm size` (después de `pnpm build`).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Presupuesto del plan (§10): JS inicial por debajo de 250 KB gzip. */
const BUDGET_KB = 250;
const DIST = join(process.cwd(), 'dist');

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('No hay build en dist/. Ejecuta `pnpm build` antes de `pnpm size`.');
  process.exit(1);
}

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const referenced = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(
  (match) => match[1]
);

const visited = new Set();
const files = [];

/** Sigue los `import`/`export … from` estáticos de un módulo. */
function walk(relativePath) {
  const normalized = relativePath.replace(/^\//, '');
  if (visited.has(normalized)) return;
  visited.add(normalized);

  const absolute = join(DIST, normalized);
  if (!existsSync(absolute)) return;

  const source = readFileSync(absolute);
  files.push({
    name: normalized,
    raw: source.byteLength,
    gzip: gzipSync(source, { level: 9 }).byteLength
  });

  const text = source.toString('utf8');
  for (const match of text.matchAll(/(?:from|import)\s*\(?\s*["'](\.\.?\/[^"']+\.js)["']/g)) {
    walk(
      resolve(dirname(absolute), match[1])
        .slice(DIST.length + 1)
        .replace(/\\/g, '/')
    );
  }
}

for (const file of referenced) {
  walk(file);
}

const kb = (bytes) => bytes / 1024;
const js = files.filter((file) => file.name.endsWith('.js'));
const css = files.filter((file) => file.name.endsWith('.css'));
const totalJs = js.reduce((sum, file) => sum + file.gzip, 0);
const totalCss = css.reduce((sum, file) => sum + file.gzip, 0);
const totalRaw = js.reduce((sum, file) => sum + file.raw, 0);

console.log('\nArranque (grafo de index.html)\n');
for (const file of [...js, ...css].sort((a, b) => b.gzip - a.gzip)) {
  console.log(`  ${file.name.padEnd(44)} ${kb(file.gzip).toFixed(1).padStart(7)} KB gzip`);
}
console.log(
  `\n  JS inicial: ${kb(totalJs).toFixed(1)} KB gzip (${kb(totalRaw).toFixed(1)} KB crudo) en ${String(js.length)} archivos`
);
console.log(`  CSS:        ${kb(totalCss).toFixed(1)} KB gzip`);
console.log(`  Presupuesto: ${String(BUDGET_KB)} KB gzip de JS\n`);

if (kb(totalJs) > BUDGET_KB) {
  console.error(
    `✗ Presupuesto excedido por ${(kb(totalJs) - BUDGET_KB).toFixed(1)} KB. Divide el bundle o justifica el aumento en docs/05-plan-fases.md §10.`
  );
  process.exit(1);
}

console.log(`✓ Dentro del presupuesto (${(BUDGET_KB - kb(totalJs)).toFixed(1)} KB de margen).`);
