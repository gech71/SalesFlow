
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
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { assignBranch, approveLeadDistrict, returnLeadForReworkDistrict, logoutAction } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
      <Sidebar>
        <SidebarHeader>
            <div className="flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://play-lh.googleusercontent.com/bXqMt9ROsGd0H9vPhib5hG-0NB-EJcAwZy6UUDhvlP-ykE595IMQtzr14R6IRWtJiGTh=w600-h300-pc0xffffff-pd" alt="NIB International Bank Logo" className="h-12 w-auto" />
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
                        <Link href="/submit-entry"><SidebarMenuButton><Icons.plusCircle className="mr-2" />Submit Entry</SidebarMenuButton></Link>
                    </SidebarMenuItem>
                )}
                {permissions.includes('district_assignments:read') && (
                    <SidebarMenuItem>
                        <Link href="/district-assignments"><SidebarMenuButton isActive><Icons.building className="mr-2" />District View</SidebarMenuButton></Link>
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
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">District View</h1>
            </div>
            
            <div className="grid gap-6">
                <Card>
                    <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Assign Leads to Branches</CardTitle>
                        <CardDescription>
                          An overview of all unassigned leads in each district.
                        </CardDescription>
                    </div>
                    {permissions.includes('district_assignments:create_lead') && (
                      <Link href="/new-lead">
                        <Button><Icons.plusCircle className="mr-2 h-4 w-4" /> Create New Lead</Button>
                      </Link>
                    )}
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
                                    <div className="flex items-center gap-2">
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
