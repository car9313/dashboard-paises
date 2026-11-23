import { Flag } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { ACTIONS } from './actions';
import { filterNavByPermissions, type NavGroup } from './filter-nav';
import { RESOURCES } from './resources';

const groups: NavGroup[] = [
  {
    items: [{ label: 'Inicio', to: '/', icon: Flag }]
  },
  {
    label: 'Nomencladores',
    items: [
      {
        label: 'Países',
        to: '/nomencladores/paises',
        icon: Flag,
        resource: RESOURCES.Nomenclators,
        requiredActions: [ACTIONS.Read]
      }
    ]
  },
  {
    label: 'Vacío',
    items: [
      {
        label: 'Otra',
        to: '/otra',
        icon: Flag,
        resource: RESOURCES.Nomenclators,
        requiredActions: [ACTIONS.Create]
      }
    ]
  }
];

describe('filterNavByPermissions', () => {
  it('deja los ítems públicos aunque no haya permisos', () => {
    const visible = filterNavByPermissions(groups, () => false);

    expect(visible.flatMap((group) => group.items).map((item) => item.label)).toEqual(['Inicio']);
  });

  it('muestra los ítems protegidos cuando el permiso está concedido', () => {
    const hasPermission = vi.fn(() => true);

    const visible = filterNavByPermissions(groups, hasPermission);

    expect(visible.flatMap((group) => group.items)).toHaveLength(3);
    expect(hasPermission).toHaveBeenCalledWith(RESOURCES.Nomenclators, [ACTIONS.Read]);
  });

  it('elimina el grupo completo cuando ninguno de sus ítems es visible', () => {
    const visible = filterNavByPermissions(groups, (_resource, actions) =>
      actions.includes(ACTIONS.Read)
    );

    expect(visible.map((group) => group.label)).toEqual([undefined, 'Nomencladores']);
    expect(visible.some((group) => group.label === 'Vacío')).toBe(false);
  });
});
