
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
import { type BranchPlan, type PlanEntry, type Branch, type User } from '@prisma/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator, SidebarTrigger } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { createPlanEntry, logoutAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme-toggle';

type ClientBranchPlan = BranchPlan & {
    entries: PlanEntry[];
    branch: Branch;
}

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


export default function SubmitEntryClient({ user, permissions, plans, branches, quarters }: { user: User | null, permissions: string[], plans: ClientBranchPlan[], branches: Branch[], quarters: string[] }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id || '');
  const [selectedQuarter, setSelectedQuarter] = useState(quarters[0] || '');
  
  const { register: registerEntry, handleSubmit: handleSubmitEntry, control: controlEntry, reset: resetEntry, formState: { errors: entryErrors } } = useForm<z.infer<typeof newPlanEntrySchema>>({
    resolver: zodResolver(newPlanEntrySchema),
    defaultValues: { type: 'collection', amount: 0, description: '' }
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
                        <Link href="/submit-entry"><SidebarMenuButton isActive><Icons.plusCircle className="mr-2" />Submit Entry</SidebarMenuButton></Link>
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
                        <Link href="/offsite-reports"><SidebarMenuButton><Icons.alertTriangle className="mr-2" />Off-site Reports</SidebarMenuButton></Link>
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
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-lg font-semibold md:text-2xl">Submit Plan Entry</h1>
              </div>
              <div className="flex items-center gap-4">
                  <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
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
                    <div className="grid gap-6 lg:grid-cols-5">
                        <div className="lg:col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Submit New Entry</CardTitle>
                                    <CardDescription>Submit a new collection or withdrawal for the selected branch and quarter. It will appear as 'Pending' until reviewed.</CardDescription>
                                </CardHeader>
                                <form onSubmit={handleSubmitEntry(onNewEntrySubmit)}>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                    <TableCell className="hidden md:table-cell">{format(new Date(entry.date), "P")}</TableCell>
                                                    <TableCell className="md:hidden">{format(new Date(entry.date), "P")}</TableCell>
                                                    <TableCell><PlanTypeBadge type={entry.type as any} /></TableCell>
                                                    <TableCell className="font-medium">{formatCurrency(entry.amount)}</TableCell>
                                                    <TableCell><PlanStatusBadge status={entry.status as any} /></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
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
