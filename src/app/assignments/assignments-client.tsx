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
import type { SalesLead, LeadUpdate, District, Branch, User, Role } from '@prisma/client';
import { format } from "date-fns";
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme-toggle';
import AppSidebar from '@/components/app-sidebar';

type ClientSalesLead = SalesLead & {
    updates: LeadUpdate[];
    district: District | null;
    branch: Branch | null;
    assignee: User | null;
};

type ClientUser = User & { role: Role | null };

const formatCurrency = (amount: number | any) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(Number(amount));
}

const StatusBadge = ({ status }: { status: SalesLead['status'] }) => {
    const statusConfig = useMemo(() => {
        switch (status) {
            case 'Closed': return { variant: 'success', Icon: Icons.checkCircle2, text: 'Closed' };
            case 'PendingClosure':
            case 'PendingDistrictApproval': return { variant: 'warning', Icon: Icons.hourglass, text: status };
            case 'New': return { variant: 'info', Icon: Icons.filePlus2, text: 'New' };
            case 'Reopened': return { variant: 'warning', Icon: Icons.refreshCw, text: 'Reopened' };
            case 'Assigned': return { variant: 'default', Icon: Icons.arrowRightCircle, text: 'Assigned' };
            case 'InProgress': return { variant: 'default', Icon: Icons.loader, text: 'In Progress' };
            default: return { variant: 'secondary', Icon: Icons.circle, text: status };
        }
    }, [status]);

    const iconClassName = status === 'InProgress' ? 'animate-spin' : '';

    return (
        <Badge variant={statusConfig.variant}>
            <statusConfig.Icon className={cn("h-3 w-3", iconClassName)} />
            <span>{statusConfig.text}</span>
        </Badge>
    );
};

export default function AssignmentsClient({ user, permissions, leads }: { user: ClientUser | null, permissions: string[], leads: ClientSalesLead[] }) {
  
  return (
    <SidebarProvider>
      <AppSidebar user={user} permissions={permissions} />
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">My Assignments</h1>
                <div className="ml-auto">
                    <ThemeToggle />
                </div>
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
                        <BreadcrumbPage>My Assignments</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Manage Your Leads</CardTitle>
                    <CardDescription>
                      An overview of all leads assigned to you.
                    </CardDescription>
                </div>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Lead Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden md:table-cell">Assigned To</TableHead>
                        <TableHead>Savings Progress</TableHead>
                        <TableHead className="hidden lg:table-cell">Location</TableHead>
                        <TableHead className="hidden lg:table-cell">Created At</TableHead>
                        <TableHead className="hidden md:table-cell">Deadline</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {leads.map((lead) => {
                        const totalGeneratedSavings = lead.updates.reduce((acc, update) => acc + (Number(update.generatedSavings) || 0), 0);
                        const achievementPercentage = Number(lead.expectedSavings) > 0 ? Math.min(100, (totalGeneratedSavings / Number(lead.expectedSavings)) * 100) : 0;
                        return (
                            <TableRow key={lead.id}>
                                <TableCell className="font-medium truncate max-w-xs">{lead.title}</TableCell>
                                <TableCell><StatusBadge status={lead.status as any} /></TableCell>
                                <TableCell className="hidden md:table-cell truncate">{lead.assignee?.name || 'N/A'}, {lead.branch?.name || 'N/A'}, {lead.district?.name || 'N/A'}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{formatCurrency(lead.expectedSavings)} <span className="text-xs text-muted-foreground">Target</span></div>
                                    <Progress value={achievementPercentage} className="mt-1 h-2" />
                                    <div className="text-xs text-muted-foreground">{achievementPercentage.toFixed(0)}% achieved</div>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${lead.lat},${lead.lng}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-primary hover:underline"
                                    >
                                        <Icons.mapPin className="h-4 w-4" /> View Map
                                    </a>
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">{format(new Date(lead.createdAt), "PPP")}</TableCell>
                                <TableCell className="hidden md:table-cell">{lead.deadline ? format(new Date(lead.deadline), "PPP") : 'N/A'}</TableCell>
                                <TableCell>
                                    <Link href={`/assignments/${lead.id}`}>
                                        <Button variant="outline" size="sm">Details</Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
