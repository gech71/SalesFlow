
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
import type { SalesLead, LeadUpdate, User, Role } from '@prisma/client';
import { format } from "date-fns";
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme-toggle';
import AppSidebar from '@/components/app-sidebar';

type OffsiteReport = {
  lead: SalesLead & { assignee: User | null };
  update: LeadUpdate;
  distance: number;
};

type ClientUser = User & { role: Role | null };

export default function OffsiteReportsClient({ user, permissions, reports }: { user: ClientUser | null, permissions: string[], reports: OffsiteReport[] }) {

  return (
    <SidebarProvider>
      <AppSidebar user={user} permissions={permissions} />
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="flex-1 text-xl font-semibold tracking-tight">Off-site Reports</h1>
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
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Lead</TableHead>
                            <TableHead>Officer</TableHead>
                            <TableHead>Reported Date</TableHead>
                            <TableHead>Distance</TableHead>
                            <TableHead className="hidden md:table-cell">Update Text</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {reports.map(({ lead, update, distance }) => (
                            <TableRow key={`${lead.id}-${update.id}`}>
                                <TableCell className="font-medium truncate max-w-xs">{lead.title}</TableCell>
                                <TableCell>{lead.assignee?.name || 'N/A'}</TableCell>
                                <TableCell>{format(new Date(update.timestamp), "PPp")}</TableCell>
                                <TableCell>
                                    <Badge variant="warning">
                                      <Icons.shieldAlert className="h-3 w-3" />
                                      <span>{distance.toFixed(2)} km away</span>
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground hidden md:table-cell truncate">{update.text}</TableCell>
                                <TableCell>
                                    <Link href={`/assignments/${lead.id}`}>
                                        <Button variant="outline" size="sm">View Lead</Button>
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="grid gap-4 md:hidden">
                    {reports.map(({ lead, update, distance }) => (
                      <Card key={`${lead.id}-${update.id}`}>
                        <CardHeader>
                          <div className="flex justify-between items-start gap-4">
                            <CardTitle className="text-base">{lead.title}</CardTitle>
                             <Badge variant="warning">
                                <Icons.shieldAlert className="h-3 w-3" />
                                <span>{distance.toFixed(2)} km</span>
                            </Badge>
                          </div>
                           <CardDescription className="pt-2">
                                Officer: {lead.assignee?.name || 'N/A'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p className="text-muted-foreground break-words">{update.text}</p>
                            <div className="text-xs text-muted-foreground pt-2">
                                Reported on {format(new Date(update.timestamp), "PPp")}
                            </div>
                        </CardContent>
                        <CardFooter>
                           <Link href={`/assignments/${lead.id}`} className="w-full">
                                <Button variant="outline" size="sm" className="w-full">View Lead Details</Button>
                            </Link>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>

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
