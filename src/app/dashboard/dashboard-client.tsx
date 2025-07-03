
'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
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
import { Progress } from '@/components/ui/progress';
import { Icons } from '@/components/icons';
import { type SalesLead, type BranchPlan, type District, type Branch, type LeadUpdate, type PlanEntry, type User } from '@prisma/client';
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator, SidebarTrigger } from '@/components/ui/sidebar';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logoutAction } from '@/app/actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme-toggle';

type ClientSalesLead = SalesLead & { updates: LeadUpdate[] };
type ClientBranchPlan = BranchPlan & { entries: PlanEntry[] };
type ClientBranch = Branch & { users: User[] };

interface DashboardClientProps {
  user: User | null;
  permissions: string[];
  leads: ClientSalesLead[];
  plans: ClientBranchPlan[];
  districts: District[];
  branches: ClientBranch[];
}

export default function DashboardClient({ user, permissions, leads, plans, districts, branches }: DashboardClientProps) {
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');

  useEffect(() => {
    setSelectedBranch('all');
  }, [selectedDistrict]);

  const canViewSettings = useMemo(() => permissions.some(p => p.startsWith('settings:')), [permissions]);

  const dashboardStats = useMemo(() => {
    const filteredLeads = leads.filter(lead => {
        const districtMatch = selectedDistrict === 'all' || lead.districtId === selectedDistrict;
        const branchMatch = selectedBranch === 'all' || lead.branchId === selectedBranch;
        return districtMatch && branchMatch;
    });

    const filteredPlans = plans.filter(plan => {
        const branch = branches.find(b => b.id === plan.branchId);
        if(!branch) return false;
        const districtMatch = selectedDistrict === 'all' || branch.districtId === selectedDistrict;
        const branchMatch = selectedBranch === 'all' || plan.branchId === selectedBranch;
        return districtMatch && branchMatch;
    });

    const totalLeads = filteredLeads.length;
    const totalExpectedSavings = filteredLeads.reduce((acc, lead) => acc + Number(lead.expectedSavings), 0);
    const totalGeneratedSavings = filteredLeads.reduce((acc, lead) => {
        const leadSavings = lead.updates.reduce((s: any, u: any) => s + Number(u.generatedSavings || 0), 0);
        return acc + leadSavings;
    }, 0);
    const overallAchievement = totalExpectedSavings > 0 ? (totalGeneratedSavings / totalExpectedSavings) * 100 : 0;
    
    const leadsByStatus = filteredLeads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
    }, {} as Record<SalesLead['status'], number>);
    
    const statusChartData = Object.entries(leadsByStatus).map(([status, count]) => ({ status, count }));

    const performanceByDistrict = districts
      .filter(d => selectedDistrict === 'all' || d.id === selectedDistrict)
      .map(district => {
        const districtLeads = filteredLeads.filter(l => l.districtId === district.id);
        const expected = districtLeads.reduce((acc, lead) => acc + Number(lead.expectedSavings), 0);
        const generated = districtLeads.reduce((acc, lead) => acc + lead.updates.reduce((s, u) => s + Number(u.generatedSavings || 0), 0), 0);
        const achievement = expected > 0 ? Math.min(100, (generated / expected) * 100) : 0;
        return {
            id: district.id,
            name: district.name,
            expected,
            generated,
            achievement,
        }
    }).sort((a, b) => b.achievement - a.achievement);

    const performanceByBranch = branches
      .filter(b => {
          const districtMatch = selectedDistrict === 'all' || b.districtId === selectedDistrict;
          const branchMatch = selectedBranch === 'all' || b.id === selectedBranch;
          return districtMatch && branchMatch;
      })
      .map(branch => {
        const branchLeads = filteredLeads.filter(l => l.branchId === branch.id);
        const expected = branchLeads.reduce((acc, lead) => acc + Number(lead.expectedSavings), 0);
        const generated = branchLeads.reduce((acc, lead) => acc + lead.updates.reduce((s, u) => s + Number(u.generatedSavings || 0), 0), 0);
        const achievement = expected > 0 ? Math.min(100, (generated / expected) * 100) : 0;
        const districtName = districts.find(d => d.id === branch.districtId)?.name || 'N/A';
        return {
            id: branch.id,
            name: branch.name,
            district: districtName,
            expected,
            generated,
            achievement,
        }
      }).sort((a, b) => b.achievement - a.achievement);

      const branchPlanPerformance = filteredPlans.map(plan => {
          const branchName = branches.find(b => b.id === plan.branchId)?.name || 'N/A';
          const approvedEntries = plan.entries.filter(e => e.status === 'Approved');
          const collections = approvedEntries.filter(e => e.type === 'collection').reduce((acc, e) => acc + Number(e.amount), 0);
          const withdrawals = approvedEntries.filter(e => e.type === 'withdrawal').reduce((acc, e) => acc + Number(e.amount), 0);
          const netSavings = collections - withdrawals;
          const achievement = Number(plan.savingsTarget) > 0 ? Math.min(100, (netSavings / Number(plan.savingsTarget)) * 100) : 0;
          return {
              id: plan.id,
              branchName,
              quarter: plan.quarter,
              target: Number(plan.savingsTarget),
              netSavings,
              achievement
          }
      }).sort((a,b) => b.achievement - a.achievement);

    return {
      totalLeads,
      totalExpectedSavings,
      totalGeneratedSavings,
      overallAchievement,
      statusChartData,
      performanceByDistrict,
      performanceByBranch,
      branchPlanPerformance,
    };
  }, [leads, plans, districts, branches, selectedDistrict, selectedBranch]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(amount);
  };
  
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
            <div className="flex items-center gap-2 p-2 group-data-[state=collapsed]/sidebar-wrapper:justify-center">
                <img src="https://th.bing.com/th/id/R.f76dabe4fac17634185beac29762498b?rik=VcpX%2bw6udP0tgA&riu=http%3a%2f%2fwww.ethioxchange.com%2fstorage%2fbanks%2flogo%2f01J73Y8N756BVZ9PPKF60ZYFM0.png&ehk=IB1kPIaDd2GDbC2Ur5HlQKTKS37a6%2bglIr8W58E5PzQ%3d&risl=&pid=ImgRaw&r=0" alt="NIB Sales Logo" className="h-10 w-auto transition-all group-data-[state=collapsed]/sidebar-wrapper:h-8" />
                <h2 className="font-semibold text-lg text-primary group-data-[state=collapsed]/sidebar-wrapper:hidden">NIB Sales</h2>
            </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {permissions.includes('dashboard:read') && (
                <SidebarMenuItem>
                    <Link href="/dashboard"><SidebarMenuButton tooltip="Dashboard" isActive><Icons.dashboard /><span>Dashboard</span></SidebarMenuButton></Link>
                </SidebarMenuItem>
            )}
            {permissions.includes('assignments:read_own') && (
                <SidebarMenuItem>
                <Link href="/assignments"><SidebarMenuButton tooltip="My Assignments"><Icons.clipboardList /><span>My Assignments</span></SidebarMenuButton></Link>
                </SidebarMenuItem>
            )}
            {permissions.includes('branch_plans:read') && (
                <SidebarMenuItem>
                <Link href="/branch-plans"><SidebarMenuButton tooltip="Branch Plans"><Icons.landmark /><span>Branch Plans</span></SidebarMenuButton></Link>
            </SidebarMenuItem>
            )}
            {permissions.includes('branch_plans:create_entry') && (
                <SidebarMenuItem>
                <Link href="/submit-entry"><SidebarMenuButton tooltip="Submit Entry"><Icons.plusCircle /><span>Submit Entry</span></SidebarMenuButton></Link>
            </SidebarMenuItem>
            )}
            {permissions.includes('district_assignments:read') && (
                <SidebarMenuItem>
                <Link href="/district-assignments"><SidebarMenuButton tooltip="District View"><Icons.building /><span>District View</span></SidebarMenuButton></Link>
                </SidebarMenuItem>
            )}
            {permissions.includes('branch_assignments:read') && (
                <SidebarMenuItem>
                <Link href="/branch-assignments"><SidebarMenuButton tooltip="Branch View"><Icons.building2 /><span>Branch View</span></SidebarMenuButton></Link>
                </SidebarMenuItem>
            )}
            {permissions.includes('offsite_reports:read') && (
                <SidebarMenuItem>
                <Link href="/offsite-reports"><SidebarMenuButton tooltip="Off-site Reports"><Icons.alertTriangle /><span>Off-site Reports</span></SidebarMenuButton></Link>
                </SidebarMenuItem>
            )}
            {canViewSettings && (
                <SidebarMenuItem>
                <Link href="/settings"><SidebarMenuButton tooltip="Settings"><Icons.settings /><span>Settings</span></SidebarMenuButton></Link>
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
                            <span>Logout</span>
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
                <h1 className="text-lg font-semibold md:text-2xl">Sales Dashboard</h1>
              </div>
               <div className="flex items-center gap-4">
                    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
                        <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by District" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Districts</SelectItem>
                                {districts.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by Branch" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Branches</SelectItem>
                                {branches
                                    .filter(b => selectedDistrict === 'all' || b.districtId === selectedDistrict)
                                    .map(b => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <ThemeToggle />
                </div>
            </div>
             <Breadcrumb className="hidden md:flex">
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbPage>Dashboard</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                        <Icons.clipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats.totalLeads}</div>
                        <p className="text-xs text-muted-foreground">All active and closed leads</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Expected Savings</CardTitle>
                        <Icons.dollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(dashboardStats.totalExpectedSavings)}</div>
                        <p className="text-xs text-muted-foreground">Planned savings from all leads</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Generated Savings</CardTitle>
                        <Icons.checkCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(dashboardStats.totalGeneratedSavings)}</div>
                        <p className="text-xs text-muted-foreground">Actual savings collected so far</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lead Achievement Rate</CardTitle>
                        <Icons.target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardStats.overallAchievement.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">Generated vs. Expected savings</p>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Leads by Status</CardTitle>
                        <CardDescription>Distribution of leads across their current statuses.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{count: {label: 'Count', color: 'hsl(var(--chart-1))'}}} className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dashboardStats.statusChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="status" tickLine={false} axisLine={false} />
                                    <YAxis />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card>
                      <CardHeader>
                          <CardTitle>Branch Savings Plan Performance</CardTitle>
                          <CardDescription>Quarterly savings plan achievement rates for each branch.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Branch</TableHead>
                                      <TableHead>Quarter</TableHead>
                                      <TableHead className="hidden sm:table-cell">Target</TableHead>
                                      <TableHead className="hidden sm:table-cell">Net Savings</TableHead>
                                      <TableHead className="w-[120px]">Achievement</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {dashboardStats.branchPlanPerformance.map((p) => (
                                      <TableRow key={p.id}>
                                          <TableCell className="font-medium">{p.branchName}</TableCell>
                                           <TableCell>{p.quarter}</TableCell>
                                          <TableCell className="hidden sm:table-cell">{formatCurrency(p.target)}</TableCell>
                                          <TableCell className="hidden sm:table-cell">{formatCurrency(p.netSavings)}</TableCell>
                                          <TableCell>
                                              <div className="flex items-center gap-2">
                                                  <Progress value={p.achievement} className="h-2 w-16" />
                                                  <span className="text-xs font-medium">{p.achievement.toFixed(0)}%</span>
                                              </div>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                           {dashboardStats.branchPlanPerformance.length === 0 && (
                                <div className="text-center p-8 text-muted-foreground">
                                    No branch plans match the current filter.
                                </div>
                            )}
                      </CardContent>
                  </Card>
            </div>
             <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  <Card>
                      <CardHeader>
                          <CardTitle>Lead Performance by District</CardTitle>
                          <CardDescription>Lead savings and achievement rates for each district.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>District</TableHead>
                                      <TableHead className="text-right hidden sm:table-cell">Expected</TableHead>
                                      <TableHead className="text-right hidden sm:table-cell">Generated</TableHead>
                                      <TableHead className="w-[120px]">Achievement</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {dashboardStats.performanceByDistrict.map((p) => (
                                      <TableRow key={p.id}>
                                          <TableCell className="font-medium">{p.name}</TableCell>
                                          <TableCell className="text-right hidden sm:table-cell">{formatCurrency(p.expected)}</TableCell>
                                          <TableCell className="text-right hidden sm:table-cell">{formatCurrency(p.generated)}</TableCell>
                                          <TableCell>
                                              <div className="flex items-center gap-2">
                                                  <Progress value={p.achievement} className="h-2 w-16" />
                                                  <span className="text-xs font-medium">{p.achievement.toFixed(0)}%</span>
                                              </div>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader>
                          <CardTitle>Lead Performance by Branch</CardTitle>
                          <CardDescription>Lead savings and achievement rates for each branch.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Branch</TableHead>
                                      <TableHead className="hidden sm:table-cell">District</TableHead>
                                      <TableHead className="w-[120px]">Achievement</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {dashboardStats.performanceByBranch.map((p) => (
                                      <TableRow key={p.id}>
                                          <TableCell className="font-medium">{p.name}</TableCell>
                                          <TableCell className="hidden sm:table-cell">{p.district}</TableCell>
                                          <TableCell>
                                              <div className="flex items-center gap-2">
                                                  <Progress value={p.achievement} className="h-2 w-16" />
                                                  <span className="text-xs font-medium">{p.achievement.toFixed(0)}%</span>
                                              </div>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </CardContent>
                  </Card>
                </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
