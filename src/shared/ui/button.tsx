import { Slot } from '@radix-ui/react-slot';
import { Loader2 } from 'lucide-react';
import type { ComponentProps, Ref } from 'react';

import { cn } from '@/shared/lib/cn';

import { buttonVariants, type ButtonVariantProps } from './button-variants';

export interface ButtonProps extends ComponentProps<'button'>, ButtonVariantProps {
  /** Renderiza el hijo como elemento (p. ej. un `<a>`) conservando el estilo. */
  readonly asChild?: boolean;
  /**
   * Muestra un indicador y deshabilita el botón.
   *
   * @remarks
   * El ancho se mantiene para que el layout no salte al enviar un formulario.
   * Con `asChild` no aplica: un enlace no se «envía», y añadir el spinner
   * rompería el contrato de un único hijo que exige `Slot`.
   */
  readonly loading?: boolean;
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * Acción principal de la interfaz.
 *
 * @remarks
 * No desactiva el `outline` de foco: la accesibilidad la aporta la regla global
 * `:focus-visible` de `styles.css`. Un botón debe seguir siendo enfocable y visible.
 */
export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  /*
   * `Slot` clona su ÚNICO hijo para inyectarle las props. Un fragmento o un
   * segundo nodo (el spinner) lo rompen con «Slot failed to slot onto its
   * children», así que la variante `asChild` se renderiza aparte.
   */
  if (asChild) {
    return (
      <Slot ref={ref} className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
