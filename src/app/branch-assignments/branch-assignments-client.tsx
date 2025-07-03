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
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import type { SalesLead, Branch, User, LeadUpdate, Role } from '@prisma/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator, SidebarTrigger } from '@/components/ui/sidebar';
import { assignUser, approveLeadBranch, returnLeadForReworkBranch, logoutAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme-toggle';

type ClientUser = User & { role: Role };
type ClientSalesLead = SalesLead & {
    branch: Branch | null;
    assignee: ClientUser | null;
    updates: LeadUpdate[];
};

type ClientBranch = Branch & {
    users: ClientUser[];
};

export default function BranchAssignmentsClient({ user, permissions, leads, branches }: { user: User | null, permissions: string[], leads: ClientSalesLead[], branches: ClientBranch[] }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<ClientSalesLead | null>(null);
  const [assignmentNote, setAssignmentNote] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  
  const [isReworkDialogOpen, setIsReworkDialogOpen] = useState(false);
  const [reworkNote, setReworkNote] = useState('');

  const canViewSettings = useMemo(() => permissions.some(p => p.startsWith('settings:')), [permissions]);

  const openAssignDialog = (lead: ClientSalesLead) => {
    setSelectedLead(lead);
    setSelectedUserId('');
    setAssignmentNote('');
    setIsAssignDialogOpen(true);
  };
  
  const handleConfirmAssignment = async () => {
    if (!selectedLead || !selectedUserId) {
        toast({ title: "Assignment Error", description: "You must select an officer to assign the lead.", variant: "destructive" });
        return;
    }
    
    try {
        await assignUser(selectedLead.id, selectedUserId, assignmentNote);
        toast({
            title: "Lead Assigned",
            description: "The lead has been successfully assigned to the officer.",
        });
        setIsAssignDialogOpen(false);
        router.refresh();
    } catch (error) {
        toast({ title: "Error", description: "Failed to assign lead.", variant: "destructive" });
    }
  };

  const handleApprove = async (leadId: string) => {
    try {
        await approveLeadBranch(leadId);
        toast({ title: "Lead Approved", description: "Lead has been forwarded for final approval." });
        router.refresh();
    } catch (error) {
        toast({ title: "Error", description: "Failed to approve lead.", variant: "destructive" });
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
        await returnLeadForReworkBranch(selectedLead.id, reworkNote);
        toast({ title: "Lead Returned", description: "The lead has been returned to the officer for rework." });
        setIsReworkDialogOpen(false);
        router.refresh();
    } catch (error) {
        toast({ title: "Error", description: "Failed to return lead.", variant: "destructive" });
    }
  };

  const unassignedLeads = useMemo(() => leads.filter(lead => lead.branchId && !lead.assigneeId && lead.status === 'Assigned'), [leads]);
  const pendingApprovalLeads = useMemo(() => leads.filter(lead => lead.assigneeId && lead.status === 'PendingClosure'), [leads]);
  
  const formatCurrency = (amount: number | any) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(Number(amount));

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
            <Link href="/dashboard" className="flex items-center gap-2 group-data-[state=collapsed]:justify-center">
                <img src="https://th.bing.com/th/id/R.f76dabe4fac17634185beac29762498b?rik=VcpX%2Bw6udP0tgA&riu=http%3a%2f%2fwww.ethioxchange.com%2fstorage%2fbanks%2flogo%2f01J73Y8N756BVZ9PPKF60ZYFM0.png&ehk=IB1kPIaDd2GDbC2Ur5HlQKTKS37a6%2bglIr8W58E5PzQ%3d&risl=&pid=ImgRaw&r=0" alt="NIB Sales Logo" className="h-10 w-auto transition-all group-data-[state=collapsed]:h-6" />
                <h2 className="font-semibold text-lg text-primary group-data-[state=collapsed]:hidden">NIB Sales</h2>
            </Link>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                {permissions.includes('dashboard:read') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Dashboard"><Link href="/dashboard"><Icons.dashboard /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Dashboard</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('assignments:read_own') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="My Assignments"><Link href="/assignments"><Icons.clipboardList /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">My Assignments</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('branch_plans:read') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Branch Plans"><Link href="/branch-plans"><Icons.landmark /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Branch Plans</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('branch_plans:create_entry') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Submit Entry"><Link href="/submit-entry"><Icons.plusCircle /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Submit Entry</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('district_assignments:read') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="District View"><Link href="/district-assignments"><Icons.building /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">District View</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('branch_assignments:read') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Branch View" isActive><Link href="/branch-assignments"><Icons.building2 /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Branch View</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {permissions.includes('offsite_reports:read') && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Off-site Reports"><Link href="/offsite-reports"><Icons.alertTriangle /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Off-site Reports</span></Link></SidebarMenuButton>
                    </SidebarMenuItem>
                )}
                {canViewSettings && (
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Settings"><Link href="/settings"><Icons.settings /><span className="group-data-[state=collapsed]/sidebar-wrapper:hidden">Settings</span></Link></SidebarMenuButton>
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
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">Branch View</h1>
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
                        <BreadcrumbPage>Branch View</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Assign Leads to Officers</CardTitle>
                        <CardDescription>An overview of all unassigned leads in your branch(es).</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Lead Title</TableHead>
                            <TableHead className="hidden md:table-cell">Branch</TableHead>
                            <TableHead className="hidden lg:table-cell">Deadline</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {unassignedLeads.map((lead) => (
                            <TableRow key={lead.id}>
                                <TableCell className="font-medium truncate max-w-sm">{lead.title}</TableCell>
                                <TableCell className="hidden md:table-cell">{lead.branch?.name}</TableCell>
                                <TableCell className="hidden lg:table-cell">{lead.deadline ? format(new Date(lead.deadline), "PPP") : 'N/A'}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => openAssignDialog(lead)}>Assign</Button>
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
                        <CardTitle>Leads Pending Branch Approval</CardTitle>
                        <CardDescription>Review leads submitted for closure by officers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Lead Title</TableHead>
                                <TableHead>Officer</TableHead>
                                <TableHead className="hidden md:table-cell">Submitted On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {pendingApprovalLeads.map((lead) => {
                            const lastUpdate = lead.updates?.[0];
                            return (
                                <TableRow key={lead.id}>
                                    <TableCell className="font-medium truncate max-w-sm">{lead.title}</TableCell>
                                    <TableCell>{lead.assignee?.name || 'N/A'}</TableCell>
                                    <TableCell className="hidden md:table-cell">{lastUpdate ? format(new Date(lastUpdate.timestamp), "PPP") : 'N/A'}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="outline" size="sm" onClick={() => openReworkDialog(lead)}>Return</Button>
                                        <Button size="sm" onClick={() => handleApprove(lead.id)}>Approve</Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        </TableBody>
                    </Table>
                    {pendingApprovalLeads.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">
                            No leads are pending your approval.
                        </div>
                    )}
                    </CardContent>
                </Card>
            </div>
          </main>
        </div>
      </SidebarInset>
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Lead to Officer</DialogTitle>
            <DialogDescription>
                Review the lead details and assign it to a specific officer with optional instructions.
            </DialogDescription>
          </DialogHeader>
            {selectedLead && (
                <div className="space-y-4 py-2">
                    <div className="space-y-2 rounded-md border bg-muted/50 p-4">
                        <h4 className="font-semibold truncate">{selectedLead.title}</h4>
                        <p className="text-sm text-muted-foreground break-words">{selectedLead.description}</p>
                        <Separator/>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                                <p className="font-medium">Deadline</p>
                                <p className="text-muted-foreground">{selectedLead.deadline ? format(new Date(selectedLead.deadline), 'PPP') : 'N/A'}</p>
                            </div>
                            <div>
                                <p className="font-medium">Savings Target</p>
                                <p className="text-muted-foreground">{formatCurrency(selectedLead.expectedSavings)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid gap-2">
                        <Label htmlFor="officer">Assign to Officer</Label>
                        <Select onValueChange={setSelectedUserId} value={selectedUserId}>
                            <SelectTrigger id="officer" className="w-full">
                                <SelectValue placeholder="Select an officer" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.find(b => b.id === selectedLead.branchId)?.users.filter(u => u.role.name === 'OFFICER').map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="assignmentNote">Instructions / Note (Optional)</Label>
                        <Textarea 
                            id="assignmentNote" 
                            placeholder="Add a specific instruction for the officer..."
                            value={assignmentNote}
                            onChange={(e) => setAssignmentNote(e.target.value)}
                        />
                    </div>
                </div>
            )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleConfirmAssignment}>Confirm Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isReworkDialogOpen} onOpenChange={setIsReworkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return Lead for Rework</DialogTitle>
            <DialogDescription>
                Provide a clear reason for returning this lead. This will be added to the lead's update history for the officer to see.
            </DialogDescription>
          </DialogHeader>
            <div className="grid gap-2 py-2">
                <Label htmlFor="reworkNote">Reason for Returning</Label>
                <Textarea 
                    id="reworkNote" 
                    placeholder="e.g., 'Client meeting notes are missing. Please upload.'"
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
