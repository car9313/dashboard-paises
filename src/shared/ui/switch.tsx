import * as SwitchPrimitive from '@radix-ui/react-switch';
import { Check, X } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '@/shared/lib/cn';

export type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root>;

/**
 * Interruptor binario del sistema (estado activo de un país).
 *
 * @remarks
 * El nombre accesible NO se deriva del estado: quien lo usa debe pasar
 * `aria-label` con la acción y el sujeto («Activar o desactivar Cuba»), porque
 * leer solo «Cuba» no le dice al usuario qué hace el control.
 */
export function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
        'transition-colors duration-[var(--duration-fast)]',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-border-strong',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'group pointer-events-none flex size-4 items-center justify-center rounded-full bg-card text-[8px] shadow-xs',
          'transition-transform duration-[var(--duration-fast)]',
          'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'
        )}
      >
        <Check
          className="hidden text-primary group-data-[state=checked]:block"
          aria-hidden="true"
        />
        <X
          className="block text-muted-foreground group-data-[state=checked]:hidden"
          aria-hidden="true"
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}
