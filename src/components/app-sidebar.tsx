
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import type { User, Role } from '@prisma/client';
import { Sidebar, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { logoutAction } from '@/app/actions';
import { ThemeToggle } from './theme-toggle';
import { useInstallPWA } from '@/hooks/use-install-pwa';

type ClientUser = User & { role: Role | null };

interface AppSidebarProps {
  user: ClientUser | null;
  permissions: string[];
}

export default function AppSidebar({ user, permissions }: AppSidebarProps) {
  const pathname = usePathname();
  const canViewSettings = useMemo(() => permissions.some(p => p.startsWith('settings:')), [permissions]);
  const { installPrompt, handleInstall } = useInstallPWA();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 group-data-[state=collapsed]:justify-center w-full">
                <img src="/nib tera sales.png" alt="NIB Sales Logo" className="h-10 w-auto transition-all group-data-[state=collapsed]:h-8" />
            </Link>
            <div className="group-data-[state=collapsed]:hidden">
                <ThemeToggle />
            </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {permissions.includes('dashboard:read') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard" isActive={pathname === '/dashboard'}><Link href="/dashboard"><Icons.dashboard /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Dashboard</span></Link></SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {permissions.includes('assignments:read_own') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="My Assignments" isActive={pathname.startsWith('/assignments')}><Link href="/assignments"><Icons.clipboardList /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">My Assignments</span></Link></SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {permissions.includes('branch_plans:read') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Branch Plans" isActive={pathname === '/branch-plans'}><Link href="/branch-plans"><Icons.landmark /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Branch Plans</span></Link></SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {permissions.includes('branch_plans:create_entry') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Submit Entry" isActive={pathname === '/submit-entry'}><Link href="/submit-entry"><Icons.plusCircle /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Submit Entry</span></Link></SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {permissions.includes('district_assignments:read') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="District View" isActive={pathname.startsWith('/district-assignments') || pathname.startsWith('/new-lead')}><Link href="/district-assignments"><Icons.building /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">District View</span></Link></SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {permissions.includes('branch_assignments:read') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Branch View" isActive={pathname === '/branch-assignments'}><Link href="/branch-assignments"><Icons.building2 /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Branch View</span></Link></SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {permissions.includes('offsite_reports:read') && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Off-site Reports" isActive={pathname === '/offsite-reports'}><Link href="/offsite-reports"><Icons.alertTriangle /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Off-site Reports</span></Link></SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {canViewSettings && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Settings" isActive={pathname === '/settings'}><Link href="/settings"><Icons.settings /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Settings</span></Link></SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu className="rounded-md p-2">
          <SidebarMenuItem>
            <div className="flex w-full items-center gap-3 group-data-[state=collapsed]/sidebar-wrapper:justify-center">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {user?.name?.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden group-data-[state=collapsed]/sidebar-wrapper:hidden">
                <span className="truncate text-sm font-medium">{user?.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">{user?.email}</span>
              </div>
            </div>
          </SidebarMenuItem>
          {installPrompt && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleInstall} className="w-full" tooltip="Install App">
                <img src="/nib tera sales.png" alt="Install App" className="h-4 w-4" />
                <span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Install App</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <form action={logoutAction} className="w-full">
              <SidebarMenuButton type="submit" className="w-full" tooltip="Logout">
                <Icons.logout />
                <span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Logout</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
