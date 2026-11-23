import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, UserRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { logout } from '@/core/auth/session.service';
import { useSessionStore } from '@/core/auth/session.store';
import { cn } from '@/shared/lib/cn';

function initialsOf(fullName: string, username: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return username.slice(0, 1).toUpperCase();
  }

  const first = parts[0]?.charAt(0) ?? '';
  const second = parts.length > 1 ? (parts[1]?.charAt(0) ?? '') : '';

  return `${first}${second}`.toUpperCase() || username.slice(0, 1).toUpperCase();
}

/**
 * Menú de la sesión en la topbar.
 *
 * @remarks
 * Sin sesión muestra el enlace a `/login`; con sesión, la identidad y el cierre.
 * El cierre de sesión limpia primero en el backend (best-effort) y siempre deja
 * al usuario fuera localmente.
 */
export function UserMenu() {
  const user = useSessionStore((state) => state.user);
  const navigate = useNavigate();

  if (user === null) {
    return (
      <Link
        to="/login"
        className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-4" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline">Iniciar sesión</span>
      </Link>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 rounded-sm px-1.5 py-1 text-sm transition-colors',
            'hover:bg-muted data-[state=open]:bg-muted'
          )}
          aria-label={`Sesión de ${user.fullName}`}
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-[11px] font-semibold text-primary-soft-foreground">
            {initialsOf(user.fullName, user.username)}
          </span>
          <span className="hidden max-w-40 truncate sm:inline">{user.fullName}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-(--z-dropdown) min-w-56 rounded-lg border border-border bg-card p-1 shadow-md animate-fade-in"
        >
          <div className="px-2 py-2">
            <p className="truncate text-sm font-medium text-foreground">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
            {user.roles.length > 0 && (
              <p className="mt-1 truncate text-xs text-subtle-foreground">
                {user.roles.join(' · ')}
              </p>
            )}
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-foreground outline-none select-none data-[highlighted]:bg-muted"
            onSelect={() => {
              void handleLogout();
            }}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Cerrar sesión
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
