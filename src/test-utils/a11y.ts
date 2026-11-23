import axe from 'axe-core';

/**
 * Aserción de accesibilidad automática con axe-core.
 *
 * @remarks
 * Se ejecuta sobre el DOM de jsdom, así que se desactivan solo las reglas que
 * dependen de un documento completo o de estilos calculados:
 * - `color-contrast`: jsdom no resuelve colores computados ni layout. El
 *   contraste se verifica aparte, con los tokens reales
 *   (`design-system/tokens.contrast.spec.ts`).
 * - `region`: las pantallas se montan como fragmentos; los hitos los aporta el
 *   shell (`AppShell`) y no el componente bajo prueba.
 *
 * El resto de reglas —nombres accesibles, roles, `aria-*`, jerarquía de
 * encabezados, etiquetas de formulario— sí se comprueban.
 */
export async function findA11yViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false }
    }
  });

  return results.violations;
}

/** Falla con un resumen legible (id, ayuda y número de nodos) si hay violaciones. */
export async function expectNoA11yViolations(container: HTMLElement): Promise<void> {
  const violations = await findA11yViolations(container);

  if (violations.length === 0) {
    return;
  }

  const summary = violations
    .map((violation) => {
      const targets = violation.nodes
        .map((node) => node.target.join(' '))
        .slice(0, 3)
        .join(' | ');
      return `· ${violation.id}: ${violation.help} (${String(violation.nodes.length)}) → ${targets}`;
    })
    .join('\n');

  throw new Error(
    `Se encontraron ${String(violations.length)} problemas de accesibilidad:\n${summary}`
  );
}
