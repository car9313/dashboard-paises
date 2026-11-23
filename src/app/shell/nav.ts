import { Flag, Home, Palette, ShieldCheck, UsersRound } from 'lucide-react';

import { ACTIONS } from '@/core/rbac/actions';
import type { NavGroup } from '@/core/rbac/filter-nav';
import { RESOURCES } from '@/core/rbac/resources';

/**
 * Fuente única de la navegación lateral.
 *
 * Cada ítem declara el recurso y las acciones que exige. `routes.tsx` declara
 * los mismos metadatos en `handle`, así que menú y rutas no pueden divergir sin
 * que se note (`nav.spec.ts` lo verifica).
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    items: [{ label: 'Inicio', to: '/', icon: Home, end: true }]
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
    label: 'Seguridad',
    items: [
      {
        label: 'Roles',
        to: '/seguridad/roles',
        icon: ShieldCheck,
        resource: RESOURCES.Role,
        requiredActions: [ACTIONS.Read]
      },
      {
        label: 'Usuarios',
        to: '/seguridad/usuarios',
        icon: UsersRound,
        resource: RESOURCES.User,
        requiredActions: [ACTIONS.Read]
      }
    ]
  },
  {
    label: 'Sistema',
    items: [{ label: 'Sistema de diseño', to: '/design-system', icon: Palette }]
  }
];
