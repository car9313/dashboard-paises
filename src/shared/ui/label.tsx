import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

/**
 * Etiqueta asociada a un control mediante `htmlFor`.
 *
 * El asterisco de obligatorio va con `aria-hidden` porque la obligatoriedad
 * real se comunica con el atributo `required` del control.
 */
export function Label({
  className,
  required = false,
  children,
  ...props
}: ComponentProps<'label'> & { readonly required?: boolean }) {
  return (
    <label className={cn('text-sm font-medium text-foreground', className)} {...props}>
      {children}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
