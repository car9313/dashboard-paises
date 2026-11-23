import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind resolviendo conflictos: la última gana.
 *
 * @example
 * cn('px-2 py-1', props.className, isActive && 'bg-primary')
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
