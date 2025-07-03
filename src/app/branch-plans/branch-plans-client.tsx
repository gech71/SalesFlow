
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { BranchPlan, PlanEntry, Branch, User } from '@prisma/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator, SidebarTrigger } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { reviewPlanEntry, logoutAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme-toggle';

type ClientBranchPlan = BranchPlan & {
    entries: PlanEntry[];
    branch: Branch;
}

const rejectionSchema = z.object({
  rejectionReason: z.string().min(10, "A reason for rejection is required (min 10 characters)."),
});

const formatCurrency = (amount: number | any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(Number(amount));

const PlanStatusBadge = ({ status }: { status: PlanEntry['status'] }) => {
    const config = useMemo(() => {
        switch (status) {
            case 'Approved': return { variant: 'success', Icon: Icons.checkCircle2, text: 'Approved' };
            case 'Pending': return { variant: 'warning', Icon: Icons.hourglass, text: 'Pending' };
            case 'Rejected': return { variant: 'destructive', Icon: Icons.xCircle, text: 'Rejected' };
            default: return { variant: 'secondary', Icon: Icons.circle, text: status };
        }
    }, [status]);

    return (
        <Badge variant={config.variant}>
            <config.Icon className="h-3 w-3" />
            <span>{config.text}</span>
        </Badge>
    );
};

const PlanTypeBadge = ({ type }: { type: PlanEntry['type'] }) => {
    const config = useMemo(() => {
        switch (type) {
            case 'collection': return { variant: 'success', Icon: Icons.arrowDownCircle, text: 'Collection' };
            case 'withdrawal': return { variant: 'warning', Icon: Icons.arrowUpCircle, text: 'Withdrawal' };
            default: return { variant: 'secondary', Icon: Icons.circle, text: type };
        }
    }, [type]);

    return (
        <Badge variant={config.variant}>
            <config.Icon className="h-3 w-3" />
            <span>{config.text}</span>
        </Badge>
    );
};

export default function BranchPlansClient({ user, permissions, plans, branches, quarters, defaultQuarter }: { user: User | null, permissions: string[], plans: ClientBranchPlan[], branches: Branch[], quarters: string[], defaultQuarter: string }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [selectedQuarter, setSelectedQuarter] = useState(defaultQuarter || quarters[0] || '');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PlanEntry | null>(null);

  const { register: registerReject, handleSubmit: handleSubmitReject, reset: resetReject, formState: { errors: rejectErrors } } = useForm<z.infer<typeof rejectionSchema>>({
    resolver: zodResolver(rejectionSchema),
  });

  const canViewSettings = useMemo(() => permissions.some(p => p.startsWith('settings:')), [permissions]);

  const currentPlan = useMemo(() => {
    return plans.find(p => p.branchId === selectedBranchId && p.quarter === selectedQuarter);
  }, [plans, selectedBranchId, selectedQuarter]);

  const planStats = useMemo(() => {
    if (!currentPlan) return { totalCollections: 0, totalWithdrawals: 0, netSavings: 0, achievement: 0 };
    const approvedEntries = currentPlan.entries.filter(e => e.status === 'Approved');
    const totalCollections = approvedEntries.filter(e => e.type === 'collection').reduce((acc, e) => acc + Number(e.amount), 0);
    const totalWithdrawals = approvedEntries.filter(e => e.type === 'withdrawal').reduce((acc, e) => acc + Number(e.amount), 0);
    const netSavings = totalCollections - totalWithdrawals;
    const achievement = Number(currentPlan.savingsTarget) > 0 ? Math.min(100, (netSavings / Number(currentPlan.savingsTarget)) * 100) : 0;
    return { totalCollections, totalWithdrawals, netSavings, achievement };
  }, [currentPlan]);

  const handleReview = async (entryId: string, status: string, reason?: string) => {
    try {
        await reviewPlanEntry(entryId, status, reason);
        toast({ title: `Entry ${status}`, description: `The entry has been ${status.toLowerCase()}.` });
        if(isRejectDialogOpen) setIsRejectDialogOpen(false);
        router.refresh();
    } catch (error) {
        toast({ title: "Error", description: "Failed to review entry.", variant: "destructive" });
    }
  };
  
  const openRejectDialog = (entry: PlanEntry) => {
      setSelectedEntry(entry);
      resetReject();
      setIsRejectDialogOpen(true);
  }

  const onConfirmRejection = (data: z.infer<typeof rejectionSchema>) => {
      if(selectedEntry) {
          handleReview(selectedEntry.id, 'Rejected', data.rejectionReason);
      }
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
            <Link href="/dashboard" className="flex items-center gap-2 p-2 group-data-[state=collapsed]:justify-center">
                <img src="https://th.bing.com/th/id/R.f76dabe4fac17634185beac29762498b?rik=VcpX%2Bw6udP0tgA&riu=http%3a%2f%2fwww.ethioxchange.com%2fstorage%2fbanks%2flogo%2f01J73Y8N756BVZ9PPKF60ZYFM0.png&ehk=IB1kPIaDd2GDbC2Ur5HlQKTKS37a6%2bglIr8W58E5PzQ%3d&risl=&pid=ImgRaw&r=0" alt="NIB Sales Logo" className="h-10 w-auto transition-all group-data-[state=collapsed]:h-7" />
                <h2 className="font-semibold text-lg text-primary group-data-[state=collapsed]:hidden">NIB Sales</h2>
            </Link>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                {permissions.includes('dashboard:read') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Dashboard"><Link href="/dashboard"><Icons.dashboard /><span>Dashboard</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('assignments:read_own') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="My Assignments"><Link href="/assignments"><Icons.clipboardList /><span>My Assignments</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('branch_plans:read') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Branch Plans" isActive><Link href="/branch-plans"><Icons.landmark /><span>Branch Plans</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('branch_plans:create_entry') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Submit Entry"><Link href="/submit-entry"><Icons.plusCircle /><span>Submit Entry</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('district_assignments:read') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="District View"><Link href="/district-assignments"><Icons.building /><span>District View</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('branch_assignments:read') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Branch View"><Link href="/branch-assignments"><Icons.building2 /><span>Branch View</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('offsite_reports:read') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Off-site Reports"><Link href="/offsite-reports"><Icons.alertTriangle /><span>Off-site Reports</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {canViewSettings && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Settings"><Link href="/settings"><Icons.settings /><span>Settings</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
            </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu className="p-2">
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
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">Branch Savings Plan Review</h1>
              <div className="ml-auto flex items-center gap-2">
                  <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                      <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Select Branch" /></SelectTrigger>
                      <SelectContent>
                          {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                  </Select>
                  <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                      <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Select Quarter" /></SelectTrigger>
                      <SelectContent>
                          {quarters.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                      </SelectContent>
                  </Select>
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
                        <BreadcrumbPage>Branch Plans</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            
            {!currentPlan ? (
                <Card className="flex flex-col items-center justify-center p-12">
                    <CardHeader>
                        <CardTitle>No Plan Found</CardTitle>
                        <CardDescription>There is no savings plan for the selected branch and quarter.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Plan Summary: {currentPlan.quarter}</CardTitle>
                            <CardDescription>An overview of the savings plan for {currentPlan.branch.name}.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                                <div><p className="font-medium">Savings Target</p><p className="text-2xl font-bold">{formatCurrency(currentPlan.savingsTarget)}</p></div>
                                <div><p className="font-medium">Approved Collections</p><p className="text-2xl font-bold text-green-600">{formatCurrency(planStats.totalCollections)}</p></div>
                                <div><p className="font-medium">Approved Withdrawals</p><p className="text-2xl font-bold text-red-600">{formatCurrency(planStats.totalWithdrawals)}</p></div>
                                <div><p className="font-medium">Net Savings</p><p className="text-2xl font-bold text-primary">{formatCurrency(planStats.netSavings)}</p></div>
                            </div>
                            <div>
                                <Label>Achievement Progress ({planStats.achievement.toFixed(1)}%)</Label>
                                <Progress value={planStats.achievement} className="h-3 mt-1" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Plan Submissions Review</CardTitle>
                            <CardDescription>Review pending entries submitted by the branch. Approved/rejected entries are shown for history.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentPlan.entries.map(entry => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="hidden md:table-cell">{format(new Date(entry.date), "PPP")}</TableCell>
                                            <TableCell className="md:hidden">{format(new Date(entry.date), "P")}</TableCell>
                                            <TableCell><PlanTypeBadge type={entry.type as any} /></TableCell>
                                            <TableCell className="font-medium">{formatCurrency(entry.amount)}</TableCell>
                                            <TableCell><PlanStatusBadge status={entry.status as any} /></TableCell>
                                            <TableCell className="text-right">
                                                {entry.status === 'Pending' && permissions.includes('branch_plans:review') && (
                                                    <div className="flex gap-2 justify-end">
                                                        <Button size="sm" variant="outline" onClick={() => openRejectDialog(entry)}>Reject</Button>
                                                        <Button size="sm" onClick={() => handleReview(entry.id, 'Approved')}>Approve</Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {currentPlan.entries.length === 0 && <div className="text-center p-8 text-muted-foreground">No entries submitted yet.</div>}
                        </CardContent>
                    </Card>
                </div>
            )}
          </main>
        </div>
      </SidebarInset>
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmitReject(onConfirmRejection)}>
            <DialogHeader>
              <DialogTitle>Reject Entry</DialogTitle>
              <DialogDescription>
                  You must provide a clear reason for rejecting this entry. This will be visible to the Branch Manager.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-4">
                <Label htmlFor="rejectionReason">Reason for Rejection</Label>
                <Textarea id="rejectionReason" {...registerReject("rejectionReason")} />
                {rejectErrors.rejectionReason && <p className="text-red-500 text-xs mt-1">{rejectErrors.rejectionReason.message}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Confirm Rejection</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

    

    