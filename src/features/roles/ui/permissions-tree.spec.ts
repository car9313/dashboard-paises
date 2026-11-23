import { describe, expect, it } from 'vitest';

import type { PermissionCategory } from '../domain/role';
import { applyGroup, buildTree, keysOfCategory, keysOfResource, stateOf } from './permissions-tree';

const catalog: readonly PermissionCategory[] = [
  {
    category: 'Nomencladores',
    permissions: [
      { resource: 'Nomenclators', description: 'Países', actions: ['Leer', 'Crear', 'Actualizar'] }
    ]
  },
  {
    category: 'Auditoría',
    permissions: [{ resource: 'Audit', description: 'Auditoría', actions: ['Leer'] }]
  }
];

describe('buildTree', () => {
  it('anida categoría → recurso → acción', () => {
    const tree = buildTree(catalog);

    expect(tree).toHaveLength(2);
    expect(tree[0]?.category).toBe('Nomencladores');
    expect(tree[0]?.resources[0]?.description).toBe('Países');
    expect(tree[0]?.resources[0]?.actions.map((action) => action.action)).toEqual([
      'Leer',
      'Crear',
      'Actualizar'
    ]);
    expect(tree[0]?.resources[0]?.actions[1]?.key).toBe('Nomenclators:Crear');
  });

  it('no inventa recursos que el catálogo no ofrece', () => {
    const tree = buildTree(catalog, catalog);
    const actionCount = tree.flatMap((node) => node.resources).flatMap((node) => node.actions);

    expect(actionCount).toHaveLength(4);
  });
});

describe('stateOf', () => {
  const keys = keysOfResource(buildTree(catalog)[0]!.resources[0]!);

  it('devuelve unchecked sin ninguna hoja', () => {
    expect(stateOf(new Set(), keys)).toBe('unchecked');
  });

  it('devuelve checked con todas las hojas', () => {
    expect(stateOf(new Set(keys), keys)).toBe('checked');
  });

  it('devuelve indeterminate con algunas hojas', () => {
    expect(stateOf(new Set(['Nomenclators:Leer']), keys)).toBe('indeterminate');
  });
});

describe('applyGroup', () => {
  it('propaga hacia abajo al marcar un grupo', () => {
    const tree = buildTree(catalog);
    const next = applyGroup(new Set(), keysOfCategory(tree[0]!), true);

    expect([...next].sort()).toEqual([
      'Nomenclators:Actualizar',
      'Nomenclators:Crear',
      'Nomenclators:Leer'
    ]);
  });

  it('desmarcar un grupo quita solo sus hojas', () => {
    const tree = buildTree(catalog);
    const before = new Set([...keysOfCategory(tree[0]!), 'Audit:Leer']);
    const after = applyGroup(before, keysOfCategory(tree[0]!), false);

    expect([...after]).toEqual(['Audit:Leer']);
  });

  it('no muta el conjunto recibido', () => {
    const tree = buildTree(catalog);
    const before = new Set<string>();
    applyGroup(before, keysOfCategory(tree[0]!), true);

    expect(before.size).toBe(0);
  });
});
