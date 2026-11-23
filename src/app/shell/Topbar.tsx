import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { useUiStore } from '@/core/ui/ui.store';
import { Button } from '@/shared/ui/button';

import { Breadcrumbs } from './Breadcrumbs';
import { MotionToggle } from './MotionToggle';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

/**
 * Barra superior del shell.
 *
 * Contiene el control del sidebar (drawer en móvil, colapso en escritorio), las
 * migas de pan, el tema y el menú de sesión. Es `sticky` para que el contexto de
 * navegación no se pierda al desplazar una tabla larga.
 */
export function Topbar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const setMobileOpen = useUiStore((state) => state.setMobileNavOpen);

  return (
    <header className="sticky top-0 z-(--z-sticky) flex h-(--topbar-height) items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Abrir menú"
        onClick={() => setMobileOpen(true)}
      >
        <Menu aria-hidden="true" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:inline-flex"
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        onClick={toggleSidebar}
      >
        {collapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
      </Button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <MotionToggle />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
