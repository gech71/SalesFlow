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
  CardFooter,
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
          <header className="sticky top-0 z-10 flex flex-col gap-4 border-b bg-background/95 p-4 backdrop-blur-sm md:px-6">
            <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="flex-1 text-xl font-semibold tracking-tight">My Assignments</h1>
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
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Manage Your Leads</CardTitle>
                    <CardDescription>
                      An overview of all leads assigned to you.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
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
                  </div>
                  
                  {/* Mobile Card View */}
                  <div className="grid gap-4 md:hidden">
                    {leads.map((lead) => {
                        const totalGeneratedSavings = lead.updates.reduce((acc, update) => acc + (Number(update.generatedSavings) || 0), 0);
                        const achievementPercentage = Number(lead.expectedSavings) > 0 ? Math.min(100, (totalGeneratedSavings / Number(lead.expectedSavings)) * 100) : 0;
                        return (
                          <Card key={lead.id} className="w-full">
                            <CardHeader>
                              <div className="flex justify-between items-start gap-4">
                                <CardTitle className="text-base font-semibold leading-snug whitespace-normal break-words">
                                  {lead.title}
                                </CardTitle>
                                <div className="flex-shrink-0">
                                  <StatusBadge status={lead.status as any} />
                                </div>
                              </div>
                              <CardDescription className="pt-2 text-xs">
                                Assigned to: {lead.assignee?.name || 'N/A'}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div>
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 text-sm mb-1">
                                        <span className="text-muted-foreground">Progress</span>
                                        <span className="font-semibold">{formatCurrency(totalGeneratedSavings)} / {formatCurrency(lead.expectedSavings)}</span>
                                    </div>
                                    <Progress value={achievementPercentage} className="mt-1 h-2" />
                                    <div className="text-xs text-muted-foreground mt-1 text-right">{achievementPercentage.toFixed(0)}% achieved</div>
                                </div>
                                <div className="flex items-baseline justify-between text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">Deadline:</span> 
                                    <span className="text-right">{lead.deadline ? format(new Date(lead.deadline), "PPP") : 'N/A'}</span>
                                </div>
                            </CardContent>
                            <CardFooter>
                              <Link href={`/assignments/${lead.id}`} className="w-full">
                                  <Button variant="outline" className="w-full">View Details</Button>
                              </Link>
                            </CardFooter>
                          </Card>
                        )
                    })}
                  </div>

                  {leads.length === 0 && (
                    <div className="text-center p-8 text-muted-foreground">
                        You have no assigned leads.
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
