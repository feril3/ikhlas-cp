import { IconLogout } from '@/components/icons.jsx';
import { useAuth } from '@/auth/AuthContext.jsx';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AppPreferences } from '@/features/pwa/AppPreferences.jsx';

// Inisial dari kata yang diawali huruf, jadi "Bendahara (akun uji)" menjadi "BA", bukan "B(".
export function initialsOf(name) {
  return name
    ?.split(/\s+/)
    .map((part) => part.replace(/[^\p{L}]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'IK';
}

export function roleLabel(role) {
  return role === 'ADMIN' ? 'Ketua/Admin' : 'Bendahara';
}

export function UserMenu({ compact = false, sidebar = false }) {
  const { user, logout } = useAuth();
  const initials = initialsOf(user?.name);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={
            compact
              ? 'size-(--control-height-lg) p-0'
              : sidebar
                ? 'h-auto w-full justify-start gap-2.5 rounded-2xl px-2 py-2 text-left hover:bg-sidebar-accent'
                : 'h-auto justify-start gap-2.5 px-2 py-1.5 text-left'
          }
          aria-label={compact ? `Menu akun ${user?.name ?? ''}` : undefined}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-background text-xs font-semibold text-foreground shadow-card">{initials}</AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{user?.name}</span>
              <span className="block truncate text-xs font-normal text-subtle-foreground">{roleLabel(user?.role)}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={sidebar ? 'start' : 'end'} side={sidebar ? 'top' : 'bottom'} sideOffset={8} className="w-64">
        <DropdownMenuLabel>
          <span className="block text-sm font-semibold text-foreground">{user?.name}</span>
          <span className="mt-0.5 block text-xs font-normal text-subtle-foreground">{roleLabel(user?.role)}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <AppPreferences variant="menu" />
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive">
            <IconLogout /> Keluar
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
