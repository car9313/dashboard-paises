import type { ComponentProps, Ref } from 'react';

import { cn } from '@/shared/lib/cn';

export interface InputProps extends ComponentProps<'input'> {
  readonly ref?: Ref<HTMLInputElement>;
}

/**
 * Campo de texto base.
 *
 * El estado inválido se comunica por `aria-invalid`, no por una prop propia:
 * así el estilo y la semántica no pueden divergir (accesibilidad y formularios
 * con `react-hook-form` comparten la misma señal).
 */
export function Input({ className, type = 'text', ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'h-10 w-full rounded-sm border border-border-strong bg-card px-3 text-sm text-foreground',
        'placeholder:text-subtle-foreground',
        'transition-colors duration-[var(--duration-fast)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-danger',
        className
      )}
      {...props}
    />
  );
}
