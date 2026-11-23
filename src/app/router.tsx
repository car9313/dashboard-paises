import { createBrowserRouter } from 'react-router';

import { guestOnly, requireAuth, requirePermission } from '@/core/auth/guards';
import { ACTIONS } from '@/core/rbac/actions';
import { RESOURCES } from '@/core/rbac/resources';

import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteError } from './RouteError';
import { AppShell } from './shell/AppShell';
import { BootSplash } from './shell/BootSplash';

/**
 * Rutas de la aplicación.
 *
 * Contrato (equivalente al `app.routes.ts` del proyecto origen):
 * - `loader` es el guard: el shell exige sesión y cada pantalla de negocio su
 *   permiso. Se ejecuta antes de renderizar, así que no hay parpadeo ni
 *   redirección después de montar.
 * - `handle` declara `title` (documento) y `breadcrumb` (migas), igual que el
 *   `data` del router de Angular; `resource`/`actions` documentan el permiso que
 *   aplica el loader.
 * - Las páginas se cargan con `lazy`: el formulario de login (react-hook-form +
 *   Zod) y el catálogo del sistema de diseño no viajan en el bundle inicial.
 * - Las rutas públicas (`/login`) viven fuera del shell y usan `guestOnly`.
 *
 * @remarks
 * El router se crea con una **función**, no al importar el módulo:
 * `createBrowserRouter` inicia la navegación inicial y ejecuta los `loader` de
 * inmediato. Si se creara a nivel de módulo, esos loaders (y su restauración de
 * sesión) correrían **antes** de que el arranque instale el proveedor de
 * autenticación y, en desarrollo, MSW — justo el fallo intermitente de F5 que se
 * diagnosticó el 2026-11-20: un refresh que se escapaba al backend real.
 */
export function createAppRouter() {
  return createBrowserRouter([
    {
      path: '/',
      element: <AppShell />,
      errorElement: <RouteError />,
      hydrateFallbackElement: <BootSplash />,
      loader: requireAuth,
      children: [
        {
          index: true,
          lazy: async () => {
            const { HomePage } = await import('./pages/HomePage');
            return { Component: HomePage };
          },
          handle: { breadcrumb: 'Inicio', title: 'Inicio' }
        },
        {
          path: 'seguridad/roles',
          lazy: async () => {
            const { RolesPage } = await import('@/features/roles');
            return { Component: RolesPage };
          },
          loader: requirePermission(RESOURCES.Role, [ACTIONS.Read]),
          handle: {
            breadcrumb: 'Roles',
            title: 'Roles',
            resource: RESOURCES.Role,
            actions: [ACTIONS.Read]
          }
        },
        {
          path: 'seguridad/usuarios',
          lazy: async () => {
            const { UsersPage } = await import('@/features/users');
            return { Component: UsersPage };
          },
          loader: requirePermission(RESOURCES.User, [ACTIONS.Read]),
          handle: {
            breadcrumb: 'Usuarios',
            title: 'Usuarios',
            resource: RESOURCES.User,
            actions: [ACTIONS.Read]
          }
        },
        {
          path: 'nomencladores/paises',
          lazy: async () => {
            const { CountriesPage } = await import('@/features/countries/ui/CountriesPage');
            return { Component: CountriesPage };
          },
          loader: requirePermission(RESOURCES.Nomenclators, [ACTIONS.Read]),
          handle: {
            breadcrumb: 'Países',
            title: 'Países',
            resource: RESOURCES.Nomenclators,
            actions: [ACTIONS.Read]
          }
        },
        {
          path: 'design-system',
          lazy: async () => {
            const { DesignSystemPage } = await import('@/design-system/catalog/DesignSystemPage');
            return { Component: DesignSystemPage };
          },
          handle: { breadcrumb: 'Sistema de diseño', title: 'Sistema de diseño' }
        },
        {
          path: 'acceso-denegado',
          element: <AccessDeniedPage />,
          handle: { breadcrumb: 'Acceso denegado', title: 'Acceso denegado' }
        },
        {
          path: '*',
          element: <NotFoundPage />,
          handle: { breadcrumb: 'No encontrado', title: 'No encontrado' }
        }
      ]
    },
    {
      path: '/login',
      lazy: async () => {
        const { LoginPage } = await import('@/features/auth/ui/LoginPage');
        return { Component: LoginPage };
      },
      errorElement: <RouteError />,
      hydrateFallbackElement: <BootSplash />,
      loader: guestOnly,
      handle: { title: 'Iniciar sesión' }
    }
  ]);
}
