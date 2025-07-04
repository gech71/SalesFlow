
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
import type { BranchPlan, PlanEntry, Branch, User, Role } from '@prisma/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { reviewPlanEntry } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import AppSidebar from '@/components/app-sidebar';

type ClientBranchPlan = BranchPlan & {
    entries: PlanEntry[];
    branch: Branch;
}

type ClientUser = User & { role: Role | null };

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

export default function BranchPlansClient({ user, permissions, plans, branches, quarters, defaultQuarter }: { user: ClientUser | null, permissions: string[], plans: ClientBranchPlan[], branches: Branch[], quarters: string[], defaultQuarter: string }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [selectedQuarter, setSelectedQuarter] = useState(defaultQuarter || quarters[0] || '');
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PlanEntry | null>(null);

  const { register: registerReject, handleSubmit: handleSubmitReject, reset: resetReject, formState: { errors: rejectErrors } } = useForm<z.infer<typeof rejectionSchema>>({
    resolver: zodResolver(rejectionSchema),
  });

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
      <AppSidebar user={user} permissions={permissions} />
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="flex-1 text-xl font-semibold tracking-tight">Branch Savings Plan Review</h1>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
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
                     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium whitespace-normal">SAVINGS TARGET</CardTitle>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/20 text-info-text">
                              <Icons.target className="h-6 w-6" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold break-words">{formatCurrency(currentPlan.savingsTarget)}</div>
                            <p className="text-xs text-muted-foreground break-words">Quarterly goal for {currentPlan.branch.name}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium whitespace-normal">APPROVED COLLECTIONS</CardTitle>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/20 text-success-text">
                              <Icons.arrowDownCircle className="h-6 w-6" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold break-words">{formatCurrency(planStats.totalCollections)}</div>
                            <p className="text-xs text-muted-foreground break-words">Total funds collected</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium whitespace-normal">APPROVED WITHDRAWALS</CardTitle>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-text">
                              <Icons.arrowUpCircle className="h-6 w-6" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold break-words">{formatCurrency(planStats.totalWithdrawals)}</div>
                            <p className="text-xs text-muted-foreground break-words">Total funds withdrawn</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium whitespace-normal">NET SAVINGS</CardTitle>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary-text">
                              <Icons.dollarSign className="h-6 w-6" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold break-words">{formatCurrency(planStats.netSavings)}</div>
                            <p className="text-xs text-muted-foreground break-words">Net performance against target</p>
                          </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <Card className="md:col-span-3">
                            <CardHeader>
                                <CardTitle>Achievement Progress</CardTitle>
                                <CardDescription>
                                    Progress towards the quarterly savings target for {currentPlan.branch.name}.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4">
                                <Progress value={planStats.achievement} className="h-3 flex-1" />
                                <span className="text-lg font-bold">{planStats.achievement.toFixed(1)}%</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Plan Submissions Review</CardTitle>
                                <CardDescription>Review pending entries from the branch.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentPlan.entries.filter(e => e.status === 'Pending').map(entry => (
                                            <TableRow key={entry.id}>
                                                <TableCell><PlanTypeBadge type={entry.type as any} /></TableCell>
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
                                {currentPlan.entries.filter(e => e.status === 'Pending').length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">No entries to review.</div>}
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                         <CardHeader>
                            <CardTitle>Submission History</CardTitle>
                            <CardDescription>Approved and rejected entries for the selected plan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="hidden md:table-cell">Description</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentPlan.entries.filter(e => e.status !== 'Pending').map(entry => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="hidden md:table-cell">{format(new Date(entry.date), "PPP")}</TableCell>
                                            <TableCell className="md:hidden">{format(new Date(entry.date), "P")}</TableCell>
                                            <TableCell><PlanTypeBadge type={entry.type as any} /></TableCell>
                                            <TableCell className="font-medium">{formatCurrency(entry.amount)}</TableCell>
                                            <TableCell><PlanStatusBadge status={entry.status as any} /></TableCell>
                                            <TableCell className="hidden md:table-cell text-muted-foreground truncate">{entry.description}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {currentPlan.entries.filter(e => e.status !== 'Pending').length === 0 && <div className="text-center p-8 text-muted-foreground">No submission history yet.</div>}
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
