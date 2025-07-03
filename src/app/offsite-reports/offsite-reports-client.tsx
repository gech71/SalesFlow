
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { SalesLead, LeadUpdate, User } from '@prisma/client';
import { format } from "date-fns";
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { logoutAction } from '../actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';

type OffsiteReport = {
  lead: SalesLead & { assignee: User | null };
  update: LeadUpdate;
  distance: number;
};

export default function OffsiteReportsClient({ user, permissions, reports }: { user: User | null, permissions: string[], reports: OffsiteReport[] }) {

  const canViewSettings = useMemo(() => permissions.some(p => p.startsWith('settings:')), [permissions]);

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
            <div className="flex items-center gap-2 p-2 justify-center">
                <img src="https://th.bing.com/th/id/R.f76dabe4fac17634185beac29762498b?rik=VcpX%2bw6udP0tgA&riu=http%3a%2f%2fwww.ethioxchange.com%2fstorage%2fbanks%2flogo%2f01J73Y8N756BVZ9PPKF60ZYFM0.png&ehk=IB1kPIaDd2GDbC2Ur5HlQKTKS37a6%2bglIr8W58E5PzQ%3d&risl=&pid=ImgRaw&r=0" alt="NIB Sales Logo" className="h-10 w-auto" />
                <h2 className="font-semibold text-lg text-primary">NIB Sales</h2>
            </div>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                {permissions.includes('dashboard:read') && (
                    <SidebarMenuItem>
                        <Link href="/dashboard"><SidebarMenuButton><Icons.dashboard className="mr-2" />Dashboard</SidebarMenuButton></Link>
                    </SidebarMenuItem>
                )}
                {permissions.includes('assignments:read_own') && (
                    <SidebarMenuItem>
                        <Link href="/assignments"><SidebarMenuButton><Icons.clipboardList className="mr-2" />My Assignments</SidebarMenuButton></Link>
                    </SidebarMenuItem>
                )}
                {permissions.includes('branch_plans:read') && (
                    <SidebarMenuItem>
                        <Link href="/branch-plans"><SidebarMenuButton><Icons.landmark className="mr-2" />Branch Plans</SidebarMenuButton></Link>
                    </SidebarMenuItem>
                )}
                {permissions.includes('branch_plans:create_entry') && (
                    <SidebarMenuItem>
                        <Link href="/submit-entry"><SidebarMenuButton><Icons.plusCircle className="mr-2" />Submit Entry</SidebarMenuButton></Link>
                    </SidebarMenuItem>
                )}
                {permissions.includes('district_assignments:read') && (
                    <SidebarMenuItem>
                        <Link href="/district-assignments"><SidebarMenuButton><Icons.building className="mr-2" />District View</SidebarMenuButton></Link>
                    </SidebarMenuItem>
                )}
                {permissions.includes('branch_assignments:read') && (
                    <SidebarMenuItem>
                        <Link href="/branch-assignments"><SidebarMenuButton><Icons.building2 className="mr-2" />Branch View</SidebarMenuButton></Link>
                    </SidebarMenuItem>
                )}
                {permissions.includes('offsite_reports:read') && (
                    <SidebarMenuItem>
                        <Link href="/offsite-reports"><SidebarMenuButton isActive><Icons.alertTriangle className="mr-2" />Off-site Reports</SidebarMenuButton></Link>
                    </SidebarMenuItem>
                )}
                {canViewSettings && (
                    <SidebarMenuItem>
                        <Link href="/settings"><SidebarMenuButton><Icons.settings className="mr-2" />Settings</SidebarMenuButton></Link>
                    </SidebarMenuItem>
                )}
            </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu className="p-2">
                <SidebarMenuItem>
                    <div className="flex w-full items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>
                                {user?.name?.split(" ").map((n) => n[0]).join("")}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col overflow-hidden">
                            <span className="truncate text-sm font-medium">{user?.name}</span>
                            <span className="truncate text-xs text-sidebar-foreground/70">{user?.email}</span>
                        </div>
                    </div>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <form action={logoutAction} className="w-full">
                        <SidebarMenuButton type="submit" className="w-full">
                            <Icons.logout className="mr-2" />
                            Logout
                        </SidebarMenuButton>
                    </form>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Off-site Reports</h1>
            </div>
            <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/dashboard">Dashboard</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Off-site Reports</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <Card>
                <CardHeader>
                    <CardTitle>Flagged Reports</CardTitle>
                    <CardDescription>
                      This list shows all updates reported from a location further than the configured on-site distance threshold. You can change the threshold on the <Link href="/settings" className="text-primary underline">Settings page</Link>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead>Officer</TableHead>
                        <TableHead>Reported Date</TableHead>
                        <TableHead>Distance</TableHead>
                        <TableHead>Update Text</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {reports.map(({ lead, update, distance }) => (
                        <TableRow key={`${lead.id}-${update.id}`}>
                            <TableCell className="font-medium">{lead.title}</TableCell>
                            <TableCell>{lead.assignee?.name || 'N/A'}</TableCell>
                            <TableCell>{format(new Date(update.timestamp), "PPp")}</TableCell>
                            <TableCell>
                                <Badge variant="warning">
                                  <Icons.shieldAlert className="h-3 w-3" />
                                  <span>{distance.toFixed(2)} km away</span>
                                </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{update.text}</TableCell>
                            <TableCell>
                                <Link href={`/assignments/${lead.id}`}>
                                    <Button variant="outline" size="sm">View Lead</Button>
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                 {reports.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">
                        No off-site reports found based on the current threshold.
                    </div>
                )}
                </CardContent>
            </Card>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
