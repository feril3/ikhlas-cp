import { IconLogout, IconUserCircle } from '@tabler/icons-react';
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

export function UserMenu({ compact = false, sidebar = false }) {
  const { user, logout } = useAuth();
  const initials = user?.name
    ?.split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'IK';

  const role = user?.role === 'ADMIN' ? 'Admin' : 'Bendahara';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={
            sidebar
              ? compact
                ? 'size-10 min-h-10 bg-transparent p-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                : 'h-auto min-h-10 w-full justify-start gap-3 bg-transparent px-2.5 py-2 text-left text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              : compact
                ? 'size-10 min-h-10 p-0'
                : 'h-auto min-h-10 justify-start gap-3 px-2.5 py-2 text-left'
          }
          aria-label={compact ? `Menu akun ${user?.name ?? ''}` : undefined}
        >
          <Avatar className="size-8">
            <AvatarFallback className={sidebar ? 'bg-sidebar-accent text-sidebar-accent-foreground' : undefined}>{initials}</AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-xs font-semibold">{user?.name}</strong>
              <span className={sidebar ? 'block truncate text-[11px] font-normal text-sidebar-foreground/58' : 'block truncate text-[11px] font-normal text-muted-foreground'}>{role}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={sidebar ? "start" : "end"} side={sidebar ? "right" : "bottom"} sideOffset={8} className="w-56">
        <DropdownMenuLabel>
          <span className="block text-xs font-semibold text-foreground">{user?.name}</span>
          <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{role}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled><IconUserCircle /> Profil akun</DropdownMenuItem>
          <DropdownMenuItem onSelect={logout} className="text-destructive focus:text-destructive">
            <IconLogout /> Keluar
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
