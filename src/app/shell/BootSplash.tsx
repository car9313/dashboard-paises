/**
 * Pantalla de arranque mientras los `loader` resuelven la sesión.
 *
 * Es el `hydrateFallbackElement` del router: se ve durante la restauración en el
 * primer render (F5 o enlace directo), nunca en navegaciones posteriores.
 */
export function BootSplash() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background"
      role="status"
      aria-live="polite"
    >
      <span className="flex size-10 items-center justify-center rounded-sm bg-primary text-sm font-bold text-primary-foreground">
        DP
      </span>
      <p className="text-sm text-muted-foreground">Cargando la aplicación…</p>
    </div>
  );
}
