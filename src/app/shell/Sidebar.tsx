import { useMemo } from 'react';
import { NavLink } from 'react-router';

import { buildPermissionMap, hasPermission } from '@/core/auth/permissions';
import { useSessionStore } from '@/core/auth/session.store';
import { filterNavByPermissions } from '@/core/rbac/filter-nav';
import { useUiStore } from '@/core/ui/ui.store';
import { cn } from '@/shared/lib/cn';

import { NAV_GROUPS } from './nav';

/**
 * Navegación lateral del shell.
 *
 * @remarks
 * - En `lg+` es una columna fija que se colapsa a iconos (260 px ↔ 72 px) y
 *   recuerda la preferencia.
 * - Por debajo de `lg` es un drawer superpuesto con overlay; se cierra al
 *   navegar para no tapar el contenido.
 * - El menú se filtra con **el mismo predicado** que usan los guards de ruta
 *   (ADR-014): si un ítem se ve, su ruta está permitida; si no se ve, la ruta
 *   tampoco se puede abrir escribiendo la URL.
 *
 * @remarks Movimiento
 * La animación se diseñó para que el navegador tenga poco que recalcular:
 * - El **ancho** del `aside` cambia (layout inevitable, es el efecto buscado),
 *   pero con `overflow-hidden` y sin sombras que se recalculen.
 * - Las **etiquetas no participan del layout**: son `absolute` y solo animan
 *   `opacity` y `transform`, que el compositor resuelve sin repintar el resto.
 *   Antes se animaba `max-width`, que obliga a recalcular el layout en cada
 *   frame: en equipos modestos o con zoom eso se percibe como saltos.
 * - El icono se desliza al centro con `padding-left` animado en lugar de
 *   cambiar `justify-content`, que no es animable y provocaba un salto seco.
 * - Las duraciones están sincronizadas (`--duration-slow`): si el ancho tarda
 *   240 ms, la etiqueta no puede desaparecer en 120.
 */
export function Sidebar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const mobileOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileOpen = useUiStore((state) => state.setMobileNavOpen);
  const permissions = useSessionStore((state) => state.permissions);

  const groups = useMemo(() => {
    const permissionMap = buildPermissionMap(permissions);

    return filterNavByPermissions(NAV_GROUPS, (resource, actions) =>
      hasPermission(permissionMap, resource, actions)
    );
  }, [permissions]);

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-(--z-overlay) bg-overlay lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        aria-label="Navegación principal"
        className={cn(
          'fixed inset-y-0 left-0 z-(--z-modal) flex flex-col overflow-hidden border-r border-border bg-card',
          'transition-[width,transform] duration-[var(--duration-slow)] ease-in-out lg:z-(--z-sticky) lg:translate-x-0',
          collapsed ? 'w-(--sidebar-width-collapsed)' : 'w-(--sidebar-width)',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-(--topbar-height) shrink-0 items-center overflow-hidden border-b border-border px-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary text-xs font-bold text-primary-foreground">
            DP
          </span>
          <span
            className={cn(
              'absolute left-12 truncate text-sm font-semibold text-foreground transition-[opacity,transform] duration-[var(--duration-slow)] ease-out',
              collapsed ? '-translate-x-1 opacity-0' : 'translate-x-0 opacity-100'
            )}
            aria-hidden={collapsed}
          >
            Dashboard
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4">
          {groups.map((group, groupIndex) => (
            <div key={group.label ?? `group-${groupIndex}`} className="mb-4 last:mb-0">
              {group.label !== undefined && (
                <p
                  className={cn(
                    'truncate px-2 text-[11px] font-semibold tracking-wider text-subtle-foreground uppercase transition-[opacity,transform] duration-[var(--duration-slow)] ease-out',
                    collapsed ? '-translate-x-1 opacity-0' : 'translate-x-0 opacity-100'
                  )}
                  aria-hidden={collapsed}
                >
                  {group.label}
                </p>
              )}

              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end ?? false}
                      onClick={() => setMobileOpen(false)}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'relative flex items-center rounded-sm py-2 text-sm transition-[padding,background-color,color] duration-[var(--duration-slow)] ease-in-out',
                          // El icono se desliza al centro con padding, no con justify-content:
                          // lo segundo no es animable y el salto es visible.
                          collapsed ? 'px-5' : 'gap-3 px-2',
                          isActive
                            ? 'bg-primary-soft font-medium text-primary-soft-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )
                      }
                    >
                      <item.icon className="size-4 shrink-0" aria-hidden="true" />

                      {/*
                       * `absolute`: la etiqueta no empuja el layout. Solo anima
                       * opacidad y desplazamiento, así que el navegador no
                       * recalcula la fila en cada frame.
                       */}
                      <span
                        className={cn(
                          'pointer-events-none absolute left-10 truncate transition-[opacity,transform] duration-[var(--duration-slow)] ease-out',
                          collapsed ? '-translate-x-1 opacity-0' : 'translate-x-0 opacity-100'
                        )}
                        aria-hidden={collapsed}
                      >
                        {item.label}
                      </span>

                      {collapsed && <span className="sr-only">{item.label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
