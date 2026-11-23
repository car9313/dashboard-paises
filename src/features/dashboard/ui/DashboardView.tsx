import { ArrowRight, Flag, Palette, Power, PowerOff, Tags } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

import { useSessionStore } from '@/core/auth/session.store';
import { ErrorState } from '@/shared/components/error-state';
import { KpiCard } from '@/shared/components/kpi-card';
import { PageHeader } from '@/shared/components/page-header';

import {
  computeCountryMetrics,
  formatShare,
  topInitials,
  type DashboardCountry
} from '../domain/metrics';

export interface DashboardViewProps {
  readonly countries: readonly DashboardCountry[];
  readonly isPending: boolean;
  readonly errorMessage: string | null;
  readonly onRetry: () => void;
}

const SHORTCUTS = [
  {
    to: '/nomencladores/paises',
    title: 'Países',
    description: 'Consultar, crear y editar el nomenclador.',
    icon: Flag
  },
  {
    to: '/design-system',
    title: 'Sistema de diseño',
    description: 'Tokens y componentes del dashboard.',
    icon: Palette
  }
] as const;

/**
 * Pantalla de inicio.
 *
 * @remarks
 * Es **presentacional**: recibe los países ya cargados. La composición con la
 * feature de Países la hace `app/pages/HomePage.tsx`, porque una feature no
 * importa otra (regla de `docs/02-arquitectura.md` §5).
 *
 * Las métricas se derivan en memoria del catálogo cacheado: entrar al inicio no
 * dispara ninguna petición nueva.
 */
export function DashboardView({ countries, isPending, errorMessage, onRetry }: DashboardViewProps) {
  const user = useSessionStore((state) => state.user);

  const metrics = useMemo(() => computeCountryMetrics(countries), [countries]);
  const initials = useMemo(() => topInitials(metrics, 8), [metrics]);
  const maxInitial = Math.max(1, ...initials.map((entry) => entry.count));

  const firstName = user?.fullName.split(' ')[0] ?? user?.username ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={firstName === null ? 'Inicio' : `Hola, ${firstName}`}
        description="Resumen del nomenclador de países."
      />

      {errorMessage !== null && (
        <div className="rounded-lg border border-border bg-card">
          <ErrorState message={errorMessage} onRetry={onRetry} />
        </div>
      )}

      {errorMessage === null && (
        <section aria-label="Indicadores" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Países"
            value={metrics.total}
            hint="Total del nomenclador"
            icon={Tags}
            tone="brand"
            isPending={isPending}
          />
          <KpiCard
            label="Activos"
            value={metrics.active}
            hint="Disponibles para certificar"
            icon={Power}
            tone="success"
            isPending={isPending}
          />
          <KpiCard
            label="Inactivos"
            value={metrics.inactive}
            hint="Desactivados, no eliminados"
            icon={PowerOff}
            tone="danger"
            isPending={isPending}
          />
          <KpiCard
            label="Cobertura"
            value={formatShare(metrics.activeShare)}
            hint="Porcentaje de países activos"
            icon={Flag}
            tone="neutral"
            isPending={isPending}
          />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="rounded-lg border border-border bg-card p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold text-foreground">Países por letra inicial</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Las ocho letras con más países del nomenclador.
          </p>

          {isPending && (
            <ul className="mt-4 flex flex-col gap-2" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <li key={index} className="h-5 animate-pulse rounded-sm bg-muted" />
              ))}
            </ul>
          )}

          {!isPending && initials.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">Sin datos para mostrar.</p>
          )}

          {!isPending && initials.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2">
              {initials.map((entry) => (
                <li key={entry.letter} className="flex items-center gap-3">
                  <span className="w-4 font-mono text-xs text-muted-foreground">
                    {entry.letter}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${String((entry.count / maxInitial) * 100)}%` }}
                    />
                  </span>
                  <span className="w-8 text-right text-xs text-foreground">{entry.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="sr-only">Accesos rápidos</h2>
          {SHORTCUTS.map((shortcut) => (
            <Link
              key={shortcut.to}
              to={shortcut.to}
              className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-border-strong hover:bg-muted"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary-soft text-primary-soft-foreground">
                <shortcut.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {shortcut.title}
                  <ArrowRight
                    className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              </span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
