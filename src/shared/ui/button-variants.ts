import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Variantes visuales del botón.
 *
 * Vive en su propio archivo (no junto al componente) para que el catálogo y los
 * enlaces con apariencia de botón reutilicen la escala sin que el módulo exporte
 * algo que no es un componente (regla `react-refresh/only-export-components`).
 */
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-sm font-medium whitespace-nowrap transition-colors duration-[var(--duration-fast)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'bg-muted text-foreground hover:bg-border',
        outline: 'border border-border-strong bg-transparent text-foreground hover:bg-muted',
        ghost: 'bg-transparent text-foreground hover:bg-muted',
        danger: 'bg-danger text-white hover:brightness-95'
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        icon: 'size-9 p-0'
      }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
