import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

export type SelectProps = ComponentProps<'select'>;

/**
 * Selector nativo.
 *
 * Se usa el `<select>` del navegador a propósito: en una herramienta interna
 * aporta teclado, lector de pantalla y comportamiento móvil sin código, y el
 * proyecto no necesita búsqueda dentro de las opciones (son 3).
 */
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'h-10 rounded-sm border border-border-strong bg-card px-3 text-sm text-foreground',
        'transition-colors duration-[var(--duration-fast)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-danger',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
