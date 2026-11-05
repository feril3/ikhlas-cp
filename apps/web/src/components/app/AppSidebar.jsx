import { IconExternalLink, IconScreenShare } from '@/components/icons.jsx';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext.jsx';
import { AppBrand } from '@/components/app/AppBrand.jsx';
import { UserMenu } from '@/components/app/UserMenu.jsx';
import { isActive, navGroups } from '@/components/app/navigation.js';
import { useActionCount } from '@/features/approvals/ApprovalCountsContext.jsx';
import {
  Sidebar,
  SidebarMobile,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  useSidebar
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function NavigationPanel({ mobile = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const actionCount = useActionCount();
  const { open, setOpenMobile } = useSidebar();
  const expanded = mobile || open;

  return (
    <>
      <SidebarHeader>
        <div className={`flex h-(--control-height-lg) items-center ${expanded ? 'px-1.5' : 'justify-center'}`}>
          <AppBrand compact={!expanded} />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <TooltipProvider delayDuration={200}>
          <nav aria-label="Menu utama" className="flex flex-col gap-3">
            {navGroups(user?.role).map((group) => (
              <SidebarGroup key={group.label || 'utama'}>
                {group.label && expanded && <SidebarGroupLabel forceVisible={mobile}>{group.label}</SidebarGroupLabel>}
                <SidebarMenu>
                  {group.items.map(({ to, label, icon: Icon, badge }) => {
                    const count = badge ? actionCount : 0;
                    return (
                      <Tooltip key={to}>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild active={isActive(location.pathname, to)} className={!expanded ? 'justify-center px-0' : undefined}>
                            <NavLink to={to} end={to === '/'} onClick={() => mobile && setOpenMobile(false)}>
                              <span className="relative inline-flex">
                                <Icon aria-hidden="true" stroke={1.75} />
                                {!expanded && count > 0 && <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary ring-2 ring-sidebar" />}
                              </span>
                              {expanded && <span className="truncate">{label}</span>}
                              {expanded && count > 0 && <SidebarMenuBadge aria-label={`${count} pengajuan`}>{count}</SidebarMenuBadge>}
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        {!expanded && <TooltipContent side="right">{count > 0 ? `${label} (${count})` : label}</TooltipContent>}
                      </Tooltip>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            ))}
          </nav>

          <SidebarGroup className="mt-auto">
            <SidebarMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton asChild className={!expanded ? 'justify-center px-0' : undefined}>
                    <a href="/public-display" target="_blank" rel="noreferrer">
                      <IconScreenShare aria-hidden="true" stroke={1.75} />
                      {expanded && (
                        <>
                          <span className="truncate">Tampilan publik</span>
                          <IconExternalLink aria-hidden="true" className="ml-auto text-subtle-foreground" stroke={1.75} />
                          <span className="sr-only">(membuka tab baru)</span>
                        </>
                      )}
                    </a>
                  </SidebarMenuButton>
                </TooltipTrigger>
                {!expanded && <TooltipContent side="right">Tampilan publik</TooltipContent>}
              </Tooltip>
            </SidebarMenu>
          </SidebarGroup>
        </TooltipProvider>
      </SidebarContent>

      <SidebarFooter>
        <UserMenu compact={!expanded} sidebar />
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
