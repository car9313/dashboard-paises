import { Search, X } from 'lucide-react';
import { useId } from 'react';

import { cn } from '@/shared/lib/cn';
import { Input } from '@/shared/ui/input';

export interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly label?: string;
  readonly placeholder?: string;
  readonly className?: string;
}

/**
 * Campo de búsqueda con icono y limpieza.
 *
 * El `label` es visualmente oculto pero real: un `placeholder` no es un nombre
 * accesible y desaparece al escribir.
 */
export function SearchInput({
  value,
  onChange,
  label = 'Buscar',
  placeholder = 'Buscar…',
  className
}: SearchInputProps) {
  const id = useId();

  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground"
        aria-hidden="true"
      />

      <Input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="pr-9 pl-9"
      />

      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-xs p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
