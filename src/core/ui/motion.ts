/**
 * Preferencia de movimiento de la interfaz.
 *
 * @remarks
 * El sistema operativo expone `prefers-reduced-motion`, pero el ajuste no siempre
 * es deliberado: Windows guarda «Efectos de animación» en la misma preferencia de
 * accesibilidad, así que mucha gente la tiene desactivada sin saber que también
 * apaga las animaciones de las webs (verificado el 2026-11-23 en el equipo del
 * proyecto: `SPI_GETCLIENTAREAANIMATION = False`).
 *
 * Por eso la app da control explícito con tres estados:
 * - `system`: se respeta la preferencia del sistema (valor por defecto).
 * - `always`: se anima aunque el sistema pida reducir movimiento.
 * - `never`: no se anima aunque el sistema lo permita.
 *
 * El valor vive en `data-motion` sobre `<html>`; el CSS (`styles.css`) decide con
 * ese atributo y con la media query, sin JavaScript por animación.
 */
export type MotionMode = 'system' | 'always' | 'never';

export const MOTION_ATTRIBUTE = 'data-motion';

/** Escribe la preferencia en el documento. Idempotente. */
export function applyMotion(mode: MotionMode): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.setAttribute(MOTION_ATTRIBUTE, mode);
}
