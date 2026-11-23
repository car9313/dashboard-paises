import { describe, expect, it } from 'vitest';

import type { PermissionCategory } from '../domain/role';
import {
  actionsOf,
  allActions,
  hasChanges,
  permissionKey,
  toActionCommands,
  toSelectedKeys
} from './role-permissions';

const catalog: readonly PermissionCategory[] = [
  {
    category: 'Nomencladores',
    permissions: [
      {
        resource: 'Nomenclators',
        description: 'Países',
        actions: ['Leer', 'Crear', 'Actualizar', 'Eliminar']
      }
    ]
  },
  {
    category: 'Seguridad',
    permissions: [
      {
        resource: 'User',
        description: 'Usuarios',
        actions: ['Leer', 'Crear', 'Actualizar', 'Eliminar']
      },
      {
        resource: 'Role',
        description: 'Roles',
        actions: ['Leer', 'Crear', 'Actualizar', 'Eliminar']
      }
    ]
  },
  {
    category: 'Auditoría',
    permissions: [{ resource: 'Audit', description: 'Auditoría', actions: ['Leer'] }]
  }
];

describe('permissionKey', () => {
  it('compone recurso y acción', () => {
    expect(permissionKey('User', 'Leer')).toBe('User:Leer');
  });
});

describe('toSelectedKeys', () => {
  it('marca solo las acciones concedidas', () => {
    const keys = toSelectedKeys([
      {
        category: 'Nomencladores',
        permissions: [{ resource: 'Nomenclators', description: '', actions: ['Leer'] }]
      },
      { category: 'Seguridad', permissions: [{ resource: 'Role', description: '', actions: [] }] }
    ]);

    expect([...keys]).toEqual(['Nomenclators:Leer']);
  });

  it('devuelve un conjunto vacío si el rol no tiene permisos', () => {
    expect(toSelectedKeys([]).size).toBe(0);
  });
});

describe('toActionCommands', () => {
  it('aplana la selección al payload del API', () => {
    const commands = toActionCommands(new Set(['Nomenclators:Leer', 'User:Crear']));

    expect(commands).toEqual([
      { resource: 'Nomenclators', actionType: 'Leer' },
      { resource: 'User', actionType: 'Crear' }
    ]);
  });

  it('ignora claves malformadas en lugar de romper', () => {
    const commands = toActionCommands(new Set(['sinSeparador', ':SoloAccion', 'User:Leer']));

    expect(commands).toEqual([{ resource: 'User', actionType: 'Leer' }]);
  });

  it('hace ida y vuelta sin perder información', () => {
    const original = toSelectedKeys(catalog);
    const commands = toActionCommands(original);

    expect(commands).toHaveLength(13);
    expect(commands.filter((command) => command.resource === 'Audit')).toEqual([
      { resource: 'Audit', actionType: 'Leer' }
    ]);
  });
});

describe('hasChanges', () => {
  it('detecta altas y bajas', () => {
    const initial = new Set(['User:Leer']);

    expect(hasChanges(initial, new Set(['User:Leer']))).toBe(false);
    expect(hasChanges(initial, new Set(['User:Leer', 'User:Crear']))).toBe(true);
    expect(hasChanges(initial, new Set<string>())).toBe(true);
    expect(hasChanges(initial, new Set(['User:Crear']))).toBe(true);
  });
});

describe('catálogo', () => {
  it('devuelve las acciones disponibles de un recurso', () => {
    expect(actionsOf(catalog, 'Audit')).toEqual(['Leer']);
    expect(actionsOf(catalog, 'User')).toHaveLength(4);
    expect(actionsOf(catalog, 'Inexistente')).toEqual([]);
  });

  it('lista todas las acciones distintas sin repetir', () => {
    expect(allActions(catalog)).toEqual(['Leer', 'Crear', 'Actualizar', 'Eliminar']);
  });
});
