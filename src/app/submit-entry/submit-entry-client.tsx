
'use client';

import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { type BranchPlan, type PlanEntry, type Branch, type User, type Role } from '@prisma/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { createPlanEntry } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import AppSidebar from '@/components/app-sidebar';

type ClientBranchPlan = BranchPlan & {
    entries: PlanEntry[];
    branch: Branch;
}

type ClientUser = User & { role: Role | null };

const newPlanEntrySchema = z.object({
  type: z.enum(['collection', 'withdrawal']),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  description: z.string().min(5, "Description must be at least 5 characters."),
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


export default function SubmitEntryClient({ user, permissions, plans, branches, quarters, defaultQuarter }: { user: ClientUser | null, permissions: string[], plans: ClientBranchPlan[], branches: Branch[], quarters: string[], defaultQuarter: string }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [selectedQuarter, setSelectedQuarter] = useState(defaultQuarter || quarters[0] || '');
  
  const { register: registerEntry, handleSubmit: handleSubmitEntry, control: controlEntry, reset: resetEntry, formState: { errors: entryErrors } } = useForm<z.infer<typeof newPlanEntrySchema>>({
    resolver: zodResolver(newPlanEntrySchema),
    defaultValues: { type: 'collection', amount: 0, description: '' }
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

  const onNewEntrySubmit = async (data: z.infer<typeof newPlanEntrySchema>) => {
    if (!currentPlan) {
        toast({ title: "Plan Not Found", description: "A plan for the selected branch and quarter does not exist.", variant: "destructive" });
        return;
    }
    
    try {
        await createPlanEntry(currentPlan.id, data);
        toast({ title: "Entry Submitted", description: "Your new entry has been submitted for approval." });
        resetEntry({ type: 'collection', amount: 0, description: '' });
        router.refresh();
    } catch (error) {
        toast({ title: "Error", description: "Failed to submit entry.", variant: "destructive" });
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} permissions={permissions} />
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="flex-1 text-xl font-semibold tracking-tight">Submit Plan Entry</h1>
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
                        <BreadcrumbPage>Submit Entry</BreadcrumbPage>
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info/20 text-info-text">
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20 text-success-text">
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20 text-warning-text">
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary-text">
                              <Icons.dollarSign className="h-6 w-6" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold break-words">{formatCurrency(planStats.netSavings)}</div>
                            <p className="text-xs text-muted-foreground break-words">Net performance against target</p>
                          </CardContent>
                        </Card>
                    </div>

                    <Card>
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

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                        <div className="lg:col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Submit New Entry</CardTitle>
                                    <CardDescription>Submit a new collection or withdrawal for the selected branch and quarter. It will appear as 'Pending' until reviewed.</CardDescription>
                                </CardHeader>
                                <form onSubmit={handleSubmitEntry(onNewEntrySubmit)}>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <Label htmlFor="type">Entry Type</Label>
                                                <Controller name="type" control={controlEntry} render={({ field }) => (
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="collection">Collection</SelectItem>
                                                            <SelectItem value="withdrawal">Withdrawal</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )} />
                                            </div>
                                            <div>
                                                <Label htmlFor="amount">Amount</Label>
                                                <Input id="amount" type="number" {...registerEntry("amount")} />
                                                {entryErrors.amount && <p className="text-red-500 text-xs mt-1">{entryErrors.amount.message}</p>}
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="description">Description</Label>
                                            <Textarea id="description" {...registerEntry("description")} placeholder="Provide details about this entry..." />
                                            {entryErrors.description && <p className="text-red-500 text-xs mt-1">{entryErrors.description.message}</p>}
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button type="submit" className="w-full">Submit for Approval</Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </div>

                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Recent Submissions</CardTitle>
                                    <CardDescription>Status of entries for the selected plan.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {currentPlan && currentPlan.entries.map(entry => (
                                                    <TableRow key={entry.id}>
                                                        <TableCell>{format(new Date(entry.date), "PPP")}</TableCell>
                                                        <TableCell><PlanTypeBadge type={entry.type as any} /></TableCell>
                                                        <TableCell className="font-medium">{formatCurrency(entry.amount)}</TableCell>
                                                        <TableCell><PlanStatusBadge status={entry.status as any} /></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    
                                    {/* Mobile Cards */}
                                    <div className="grid gap-4 md:hidden">
                                        {currentPlan && currentPlan.entries.map(entry => (
                                            <Card key={entry.id}>
                                                <CardHeader className="p-4">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="font-medium">{formatCurrency(entry.amount)}</div>
                                                        <PlanStatusBadge status={entry.status as any} />
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-4 pt-0">
                                                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                    <PlanTypeBadge type={entry.type as any} />
                                                    <span>{format(new Date(entry.date), "P")}</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>

                                    {(!currentPlan || currentPlan.entries.length === 0) && <div className="text-center p-8 text-muted-foreground">No entries submitted yet.</div>}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
