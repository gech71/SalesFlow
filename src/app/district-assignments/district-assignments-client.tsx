
'use client';

import { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import type { SalesLead, District, Branch, User } from '@prisma/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator, SidebarTrigger } from '@/components/ui/sidebar';
import { assignBranch, approveLeadDistrict, returnLeadForReworkDistrict, logoutAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme-toggle';

type ClientSalesLead = SalesLead & {
    district: District | null;
    branch: Branch | null;
    assignee: User | null;
};

type ClientDistrict = District & {
    branches: Branch[];
}

export default function DistrictAssignmentsClient({ user, leads, districts, permissions }: { user: User | null, leads: ClientSalesLead[], districts: ClientDistrict[], permissions: string[] }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isReworkDialogOpen, setIsReworkDialogOpen] = useState(false);
  const [reworkNote, setReworkNote] = useState('');
  const [selectedLead, setSelectedLead] = useState<ClientSalesLead | null>(null);
  const [pendingAssignments, setPendingAssignments] = useState<Record<string, string>>({});

  const canViewSettings = useMemo(() => permissions.some(p => p.startsWith('settings:')), [permissions]);

  const handleBranchSelection = (leadId: string, branchId: string) => {
    setPendingAssignments(prev => ({
      ...prev,
      [leadId]: branchId,
    }));
  };

  const handleAssignBranch = async (leadId: string, branchId: string) => {
    try {
        await assignBranch(leadId, branchId);
        toast({
            title: "Lead Assigned",
            description: "The lead has been assigned to the branch.",
        });
        setPendingAssignments(prev => {
            const newState = { ...prev };
            delete newState[leadId];
            return newState;
        });
        router.refresh();
    } catch (error) {
        toast({ title: "Error", description: "Failed to assign lead.", variant: "destructive" });
    }
  };

  const handleApproveAndClose = async (leadId: string) => {
    try {
        await approveLeadDistrict(leadId);
        toast({ title: "Lead Closed", description: "The lead has been successfully closed." });
        router.refresh();
    } catch (error) {
        toast({ title: "Error", description: "Failed to close lead.", variant: "destructive" });
    }
  };

  const openReworkDialog = (lead: ClientSalesLead) => {
    setSelectedLead(lead);
    setReworkNote('');
    setIsReworkDialogOpen(true);
  };

  const handleConfirmRework = async () => {
    if (!selectedLead || !reworkNote) {
        toast({ title: "Note Required", description: "Please provide a reason for returning the lead.", variant: "destructive" });
        return;
    }

    try {
        await returnLeadForReworkDistrict(selectedLead.id, reworkNote);
        toast({ title: "Lead Returned", description: "The lead has been returned for rework." });
        setIsReworkDialogOpen(false);
        router.refresh();
    } catch (error) {
        toast({ title: "Error", description: "Failed to return lead.", variant: "destructive" });
    }
  };

  const unassignedLeads = useMemo(() => leads.filter(lead => lead.districtId && !lead.branchId), [leads]);
  const pendingApprovalLeads = useMemo(() => leads.filter(lead => lead.status === 'PendingDistrictApproval'), [leads]);

  const getBranchesForDistrict = (districtId: string) => {
      return districts.find(d => d.id === districtId)?.branches || [];
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
                        <SidebarMenuButton asChild tooltip="Branch Plans"><Link href="/branch-plans"><Icons.landmark /><span>Branch Plans</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('branch_plans:create_entry') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Submit Entry"><Link href="/submit-entry"><Icons.plusCircle /><span>Submit Entry</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('district_assignments:read') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="District View" isActive><Link href="/district-assignments"><Icons.building /><span>District View</span></Link></SidebarMenuButton>
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
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">District View</h1>
                <div className="ml-auto flex items-center gap-4">
                    {permissions.includes('district_assignments:create_lead') && (
                    <Link href="/new-lead">
                        <Button><Icons.plusCircle className="mr-2 h-4 w-4" /> Create New Lead</Button>
                    </Link>
                    )}
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
                        <BreadcrumbPage>District View</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Assign Leads to Branches</CardTitle>
                        <CardDescription>
                          An overview of all unassigned leads in each district.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Lead Title</TableHead>
                            <TableHead className="hidden md:table-cell">District</TableHead>
                            <TableHead className="hidden md:table-cell">Created At</TableHead>
                            <TableHead className="hidden lg:table-cell">Deadline</TableHead>
                            <TableHead>Assign to Branch</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {unassignedLeads.map((lead) => (
                            <TableRow key={lead.id}>
                                <TableCell className="font-medium">{lead.title}</TableCell>
                                <TableCell className="hidden md:table-cell">{lead.district?.name}</TableCell>
                                <TableCell className="hidden md:table-cell">{format(new Date(lead.createdAt), "PPP")}</TableCell>
                                <TableCell className="hidden lg:table-cell">{lead.deadline ? format(new Date(lead.deadline), "PPP") : 'N/A'}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <Select
                                            value={pendingAssignments[lead.id] || ''}
                                            onValueChange={(branchId) => handleBranchSelection(lead.id, branchId)}
                                            disabled={!permissions.includes('district_assignments:assign_branch')}
                                        >
                                            <SelectTrigger className="w-full sm:w-[180px]">
                                                <SelectValue placeholder="Select a branch" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getBranchesForDistrict(lead.districtId!).map(branch => (
                                                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {pendingAssignments[lead.id] && permissions.includes('district_assignments:assign_branch') && (
                                            <Button size="sm" onClick={() => handleAssignBranch(lead.id, pendingAssignments[lead.id])}>Confirm</Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    {unassignedLeads.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            No new leads to assign.
                        </div>
                    )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Leads Pending Final Approval</CardTitle>
                        <CardDescription>Review leads that have been approved by branches and are ready for final closure.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Lead Title</TableHead>
                                    <TableHead className="hidden md:table-cell">Branch</TableHead>
                                    <TableHead className="hidden md:table-cell">Officer</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingApprovalLeads.map(lead => (
                                    <TableRow key={lead.id}>
                                        <TableCell className="font-medium">{lead.title}</TableCell>
                                        <TableCell className="hidden md:table-cell">{lead.branch?.name}</TableCell>
                                        <TableCell className="hidden md:table-cell">{lead.assignee?.name}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {permissions.includes('district_assignments:approve') && (
                                              <>
                                                <Button variant="outline" size="sm" onClick={() => openReworkDialog(lead)}>Return</Button>
                                                <Button size="sm" onClick={() => handleApproveAndClose(lead.id)}>Approve & Close</Button>
                                              </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {pendingApprovalLeads.length === 0 && (
                           <div className="text-center p-8 text-muted-foreground">
                                No leads pending final approval.
                           </div>
                        )}
                    </CardContent>
                </Card>
            </div>
          </main>
        </div>
      </SidebarInset>
       <Dialog open={isReworkDialogOpen} onOpenChange={setIsReworkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return Lead for Rework</DialogTitle>
            <DialogDescription>
                Provide a clear reason for returning this lead. This will be added to the lead's update history.
            </DialogDescription>
          </DialogHeader>
            <div className="grid gap-2 py-2">
                <Label htmlFor="reworkNote">Reason for Returning</Label>
                <Textarea 
                    id="reworkNote" 
                    placeholder="e.g., 'Please collect additional documentation from the client.'"
                    value={reworkNote}
                    onChange={(e) => setReworkNote(e.target.value)}
                />
            </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleConfirmRework}>Confirm Return</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

    

    