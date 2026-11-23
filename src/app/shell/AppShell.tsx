import { Outlet, useLocation } from 'react-router';

import { useUiStore } from '@/core/ui/ui.store';
import { cn } from '@/shared/lib/cn';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/**
 * Marco de la aplicación autenticada: sidebar + topbar + contenido.
 *
 * @remarks
 * El desplazamiento del contenido se compensa con `padding-left` en lugar de
 * mover el `main`, para que el topbar `sticky` siga cubriendo todo el ancho y
 * el sidebar no genere scroll horizontal en móvil.
 *
 * El primer `Tab` de la página lleva a «Saltar al contenido» (WCAG 2.4.1): sin
 * él, quien navega con teclado recorre el sidebar entero en cada pantalla.
 *
 * El contenido se anima al cambiar de **página**: la `key` es el `pathname`, no
 * la URL completa, así que filtrar o paginar no re-dispara la animación (el
 * estado de la vista no se pierde, solo se remonta al cambiar de ruta).
 */
export function AppShell() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const { pathname } = useLocation();

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-sm focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>

      <Sidebar />

      <div
        className={cn(
          'flex min-h-dvh flex-col transition-[padding] duration-[var(--duration-slow)] ease-in-out lg:pl-(--sidebar-width)',
          collapsed && 'lg:pl-(--sidebar-width-collapsed)'
        )}
      >
        <Topbar />

        <main
          id="contenido-principal"
          tabIndex={-1}
          className="mx-auto w-full max-w-(--content-max) flex-1 px-4 py-6 sm:px-6"
        >
          <div key={pathname} className="animate-page-in">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-border px-4 py-3 text-xs text-subtle-foreground sm:px-6">
          Dashboard · Nomenclador de Países · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
