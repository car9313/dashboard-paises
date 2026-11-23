import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/cn';
import { Skeleton } from '@/shared/ui/skeleton';

export type KpiTone = 'brand' | 'success' | 'danger' | 'neutral';

const TONE_CLASSES: Record<KpiTone, string> = {
  brand: 'bg-primary-soft text-primary-soft-foreground',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-muted text-muted-foreground'
};

export interface KpiCardProps {
  readonly label: string;
  readonly value: ReactNode;
  /** Contexto del número (denominador, unidad, comparación). */
  readonly hint?: string | undefined;
  readonly icon: LucideIcon;
  readonly tone?: KpiTone;
  /** Muestra un esqueleto con la misma altura mientras carga. */
  readonly isPending?: boolean;
}

/**
 * Tarjeta de indicador.
 *
 * @remarks
 * Mientras carga conserva la altura final: si el esqueleto fuera más bajo, la
 * página «saltaría» al llegar los datos (CLS). El `hint` es obligatorio de hecho
 * aunque sea opcional en el tipo: un número sin contexto no es un indicador.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  isPending = false
}: KpiCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-sm',
          TONE_CLASSES[tone]
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>

      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>

        {isPending ? (
          <Skeleton className="mt-1 h-7 w-16" />
        ) : (
          <p className="text-2xl leading-7 font-semibold text-foreground">{value}</p>
        )}

        {hint !== undefined && <p className="text-xs text-subtle-foreground">{hint}</p>}
      </div>
    </div>
  );
}
