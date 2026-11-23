import { describe, expect, it } from 'vitest';

import { buildPermissionMap, hasPermission, type Permission } from './permissions';

const adminPermissions: Permission[] = [
  { resource: 'Nomenclators', actions: ['Leer', 'Crear', 'Actualizar', 'Eliminar'] }
];

describe('buildPermissionMap', () => {
  it('une las acciones cuando varios roles conceden el mismo recurso', () => {
    const map = buildPermissionMap([
      { resource: 'Nomenclators', actions: ['Leer'] },
      { resource: 'Nomenclators', actions: ['Crear'] }
    ]);

    expect([...(map.get('Nomenclators') ?? [])].sort()).toEqual(['Crear', 'Leer']);
  });

  it('ignora los permisos de recursos sin acciones', () => {
    const map = buildPermissionMap([{ resource: 'Audit', actions: [] }]);

    expect(map.get('Audit')?.size).toBe(0);
  });

  it('devuelve un mapa vacío sin permisos', () => {
    expect(buildPermissionMap([]).size).toBe(0);
  });
});

describe('hasPermission', () => {
  it('exige todas las acciones pedidas', () => {
    const map = buildPermissionMap([{ resource: 'Nomenclators', actions: ['Leer'] }]);

    expect(hasPermission(map, 'Nomenclators', ['Leer'])).toBe(true);
    expect(hasPermission(map, 'Nomenclators', ['Leer', 'Crear'])).toBe(false);
  });

  it('sin acciones pedidas basta con tener el recurso', () => {
    const map = buildPermissionMap(adminPermissions);

    expect(hasPermission(map, 'Nomenclators')).toBe(true);
  });

  it('niega un recurso desconocido', () => {
    const map = buildPermissionMap(adminPermissions);

    expect(hasPermission(map, 'Users', ['Leer'])).toBe(false);
  });

  it('niega cuando el recurso existe pero sin acciones', () => {
    const map = buildPermissionMap([{ resource: 'Nomenclators', actions: [] }]);

    expect(hasPermission(map, 'Nomenclators')).toBe(false);
  });
});
