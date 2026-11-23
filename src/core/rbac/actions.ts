/**
 * Acciones RBAC tal como las serializa el backend.
 *
 * Los **valores van en español** (`Leer`, `Crear`…) porque son los del contrato
 * del API; las claves en inglés porque son las que usa el código. Confundir
 * ambos produce 403 inexplicables.
 */
export const ACTIONS = {
  Read: 'Leer',
  Create: 'Crear',
  Update: 'Actualizar',
  Delete: 'Eliminar'
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

/** Todas las acciones, útil para pruebas y para el catálogo de permisos. */
export const ALL_ACTIONS: readonly Action[] = Object.values(ACTIONS);
