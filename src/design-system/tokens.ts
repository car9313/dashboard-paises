/**
 * Espejo tipado de `tokens.css` para el catálogo del sistema de diseño.
 *
 * No duplica la decisión: solo nombra las variables para poder recorrerlas y
 * mostrarlas. Si se añade un token al CSS, se añade aquí y el catálogo lo pinta.
 */

export interface ColorToken {
  /** Variable CSS exacta, sin `var()`. */
  readonly name: string;
  /** Rol en la interfaz. */
  readonly usage: string;
}

export const SURFACE_TOKENS: readonly ColorToken[] = [
  { name: '--background', usage: 'Fondo de la aplicación' },
  { name: '--foreground', usage: 'Texto principal' },
  { name: '--card', usage: 'Tarjetas, tablas y diálogos' },
  { name: '--muted', usage: 'Cabecera de tabla, toolbar' },
  { name: '--muted-foreground', usage: 'Texto secundario' },
  { name: '--subtle-foreground', usage: 'Metadatos y ayudas' },
  { name: '--border', usage: 'Separadores y contornos' },
  { name: '--border-strong', usage: 'Contorno de controles' }
];

export const BRAND_TOKENS: readonly ColorToken[] = [
  { name: '--primary', usage: 'Acción principal y marca' },
  { name: '--primary-hover', usage: 'Hover de la acción principal' },
  { name: '--primary-foreground', usage: 'Texto sobre la marca' },
  { name: '--primary-soft', usage: 'Fondo tenue de insignias' },
  { name: '--ring', usage: 'Anillo de foco' }
];

export const STATUS_TOKENS: readonly ColorToken[] = [
  { name: '--success', usage: 'Activo, confirmación' },
  { name: '--warning', usage: 'Advertencia' },
  { name: '--danger', usage: 'Error, inactivo' },
  { name: '--info', usage: 'Información neutra' }
];

export const RADIUS_TOKENS = [
  { name: '--radius-xs', value: '2px' },
  { name: '--radius-sm', value: '4px' },
  { name: '--radius-md', value: '4px' },
  { name: '--radius-lg', value: '6px' },
  { name: '--radius-xl', value: '8px' }
] as const;

export const SPACING_SCALE = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20] as const;

export const TYPE_SCALE = [
  { name: 'display', size: '28px', line: '36px', weight: 600 },
  { name: 'h1', size: '22px', line: '30px', weight: 600 },
  { name: 'h2', size: '18px', line: '26px', weight: 600 },
  { name: 'body', size: '14px', line: '22px', weight: 400 },
  { name: 'body-strong', size: '14px', line: '22px', weight: 500 },
  { name: 'small', size: '12px', line: '18px', weight: 400 },
  { name: 'code', size: '13px', line: '20px', weight: 400 }
] as const;
