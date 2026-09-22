import {
  IconAdjustments,
  IconBuildingMosque,
  IconChartBar,
  IconExternalLink,
  IconLayoutDashboard,
  IconReceipt,
  IconScreenShare,
  IconCalendarEvent
} from '@tabler/icons-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext.jsx';
import { AppBrand } from '@/components/app/AppBrand.jsx';
import { UserMenu } from '@/components/app/UserMenu.jsx';
import {
  Sidebar,
  SidebarMobile,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  useSidebar
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const groups = [
  {
    label: 'Overview',
    items: [{ to: '/', label: 'Dashboard', icon: IconLayoutDashboard }]
  },
  {
    label: 'Keuangan',
    items: [
      { to: '/transactions', label: 'Transaksi', icon: IconReceipt },
      { to: '/reports', label: 'Laporan', icon: IconChartBar }
    ]
  },
  {
    label: 'Operasional',
    items: [{ to: '/schedule', label: 'Jadwal Jumat & Agenda', icon: IconCalendarEvent }]
  },
  {
    label: 'Administrasi',
    items: [{ to: '/settings', label: 'Pengaturan', icon: IconAdjustments, roles: ['ADMIN'] }]
  }
];

function NavigationPanel({ mobile = false }) {
  const { user } = useAuth();
  const { open, setOpenMobile } = useSidebar();
  const expanded = mobile || open;

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex h-11 items-center px-1">
          <AppBrand compact={!expanded} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <TooltipProvider delayDuration={200}>
          {groups.map((group) => {
            const items = group.items.filter((item) => !item.roles || item.roles.includes(user?.role));
            if (!items.length) return null;
            return (
              <SidebarGroup key={group.label}>
                {expanded && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
                <SidebarMenu>
                  {items.map(({ to, label, icon: Icon }) => (
                    <Tooltip key={to}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={to}
                          end={to === '/'}
                          onClick={() => mobile && setOpenMobile(false)}
                          className="block"
                        >
                          {({ isActive }) => (
                            <SidebarMenuButton active={isActive}>
                              <Icon className="size-[18px]" stroke={1.8} />
                              {expanded && <span className="truncate">{label}</span>}
                            </SidebarMenuButton>
                          )}
                        </NavLink>
                      </TooltipTrigger>
                      {!expanded && <TooltipContent side="right">{label}</TooltipContent>}
                    </Tooltip>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            );
          })}

          <SidebarGroup className="mt-auto">
            {expanded && <SidebarGroupLabel>Lainnya</SidebarGroupLabel>}
            <SidebarMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href="/public-display" target="_blank" rel="noreferrer" className="block">
                    <SidebarMenuButton>
                      <IconScreenShare className="size-[18px]" stroke={1.8} />
                      {expanded && (
                        <>
                          <span className="truncate">Tampilan Publik</span>
                          <IconExternalLink className="ml-auto size-3.5 opacity-55" />
                        </>
                      )}
                    </SidebarMenuButton>
                  </a>
                </TooltipTrigger>
                {!expanded && <TooltipContent side="right">Tampilan Publik</TooltipContent>}
              </Tooltip>
            </SidebarMenu>
          </SidebarGroup>
        </TooltipProvider>
      </SidebarContent>

      <SidebarFooter>
        <div className={expanded ? 'rounded-md bg-white/[0.04]' : 'flex justify-center'}>
          <UserMenu compact={!expanded} />
        </div>
      </SidebarFooter>
    </>
  );
}

export function AppSidebar() {
  return (
    <>
      <Sidebar><NavigationPanel /></Sidebar>
      <SidebarMobile><NavigationPanel mobile /></SidebarMobile>
    </>
  );
}
