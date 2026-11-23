import { useEffect, useRef } from 'react';

import { cn } from '@/shared/lib/cn';

export interface TriStateCheckboxProps {
  readonly checked: boolean;
  /** Algunas hojas marcadas, no todas. */
  readonly indeterminate?: boolean;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

/**
 * Casilla con estado indeterminado.
 *
 * @remarks
 * `indeterminate` **no es un atributo HTML**: solo existe como propiedad del
 * input, así que hay que fijarla por DOM. Es el único efecto de este componente
 * y es legítimo: no sincroniza estado de React, escribe una propiedad que React
 * no expone de forma declarativa.
 *
 * `aria-label` va explícito porque en un árbol visual no hay `<label>` textual
 * asociado (el nombre del nodo es el texto de al lado, no del control).
 */
export function TriStateCheckbox({
  checked,
  indeterminate = false,
  label,
  onChange,
  disabled = false,
  className
}: TriStateCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current !== null) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn('size-4 shrink-0 accent-[var(--primary)]', className)}
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => {
        onChange(event.target.checked);
      }}
    />
  );
}
