'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, buttonVariants } from '@/components/ui/button';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { SalesLead, District, Branch, User, Role } from '@prisma/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { assignBranch, approveLeadDistrict, returnLeadForReworkDistrict, updateLead, deleteLead } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import AppSidebar from '@/components/app-sidebar';
import { cn } from '@/lib/utils';

type ClientSalesLead = SalesLead & {
    district: District | null;
    branch: Branch | null;
    assignee: User | null;
};

type ClientDistrict = District & {
    branches: Branch[];
};

type ClientUser = User & { role: Role | null };

const updateLeadSchema = z.object({
  id: z.string(),
  title: z.string().min(3, { message: 'Title must be at least 3 characters long.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters long.' }),
  districtId: z.string().min(1, { message: 'Please select a district.' }),
  expectedSavings: z.coerce.number().min(0, "Expected savings must be a positive number."),
  deadline: z.date({ required_error: 'A deadline date is required.' }),
});


export default function DistrictAssignmentsClient({ user, leads, districts, permissions }: { user: ClientUser | null, leads: ClientSalesLead[], districts: ClientDistrict[], permissions: string[] }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isReworkDialogOpen, setIsReworkDialogOpen] = useState(false);
  const [reworkNote, setReworkNote] = useState('');
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<ClientSalesLead | null>(null);

  const [pendingAssignments, setPendingAssignments] = useState<Record<string, string>>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const editLeadForm = useForm<z.infer<typeof updateLeadSchema>>({
    resolver: zodResolver(updateLeadSchema),
  });

  useEffect(() => {
    if (selectedLead && isEditDialogOpen) {
        editLeadForm.reset({
            id: selectedLead.id,
            title: selectedLead.title,
            description: selectedLead.description,
            districtId: selectedLead.districtId ?? undefined,
            expectedSavings: Number(selectedLead.expectedSavings),
            deadline: selectedLead.deadline ? new Date(selectedLead.deadline) : new Date(),
        });
    }
  }, [selectedLead, isEditDialogOpen, editLeadForm]);

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
    } catch (error) {
        toast({ title: "Error", description: "Failed to assign lead.", variant: "destructive" });
    }
  };

  const handleApproveAndClose = async (leadId: string) => {
    try {
        await approveLeadDistrict(leadId);
        toast({ title: "Lead Closed", description: "The lead has been successfully closed." });
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
    } catch (error) {
        toast({ title: "Error", description: "Failed to return lead.", variant: "destructive" });
    }
  };
  
  const onEditSubmit = async (data: z.infer<typeof updateLeadSchema>) => {
    try {
        await updateLead(data);
        toast({ title: "Lead Updated", description: "Lead details saved successfully." });
        setIsEditDialogOpen(false);
    } catch (error: any) {
        toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const onDeleteConfirm = async () => {
      if (!selectedLead) return;
      try {
          await deleteLead(selectedLead.id);
          toast({ title: "Lead Deleted", description: "The lead has been permanently removed." });
          setIsDeleteDialogOpen(false);
      } catch (error: any) {
          toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
      }
  };

  const unassignedLeads = useMemo(() => leads.filter(lead => lead.districtId && !lead.branchId), [leads]);
  const pendingApprovalLeads = useMemo(() => leads.filter(lead => lead.status === 'PendingDistrictApproval'), [leads]);

  const getBranchesForDistrict = (districtId: string) => {
      return districts.find(d => d.id === districtId)?.branches || [];
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} permissions={permissions} />
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex flex-wrap items-center gap-4">
                <SidebarTrigger />
                <h1 className="flex-1 text-xl font-semibold tracking-tight">District View</h1>
                <div className="ml-auto flex items-center gap-4">
                    {permissions.includes('district_assignments:create_lead') && (
                    <Link href="/new-lead">
                        <Button><Icons.plusCircle className="mr-2 h-4 w-4" /> Create New Lead</Button>
                    </Link>
                    )}
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
                            <TableHead className="hidden lg:table-cell">Deadline</TableHead>
                            <TableHead>Assign to Branch</TableHead>
                            <TableHead className="w-[80px] text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {unassignedLeads.map((lead) => (
                            <TableRow key={lead.id}>
                                <TableCell className="font-medium truncate max-w-sm">{lead.title}</TableCell>
                                <TableCell className="hidden md:table-cell">{lead.district?.name}</TableCell>
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
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><Icons.moreHorizontal /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {permissions.includes('district_assignments:edit_lead') && <DropdownMenuItem onSelect={() => { setSelectedLead(lead); setIsEditDialogOpen(true); }}><Icons.edit /> Edit Lead</DropdownMenuItem>}
                                      {permissions.includes('district_assignments:delete_lead') && <DropdownMenuItem onSelect={() => { setSelectedLead(lead); setIsDeleteDialogOpen(true); }} className="text-destructive focus:text-destructive"><Icons.trash /> Delete Lead</DropdownMenuItem>}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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
                                        <TableCell className="font-medium truncate max-w-sm">{lead.title}</TableCell>
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
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
            <form onSubmit={editLeadForm.handleSubmit(onEditSubmit)}>
                <DialogHeader>
                    <DialogTitle>Edit Lead</DialogTitle>
                    <DialogDescription>Update the details for this sales lead.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <input type="hidden" {...editLeadForm.register('id')} />
                    <div className="grid gap-2">
                        <Label htmlFor="edit-title">Title</Label>
                        <Input id="edit-title" {...editLeadForm.register('title')} />
                        {editLeadForm.formState.errors.title && <p className="text-red-500 text-xs mt-1">{editLeadForm.formState.errors.title.message}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="edit-description">Description</Label>
                        <Textarea id="edit-description" {...editLeadForm.register('description')} />
                        {editLeadForm.formState.errors.description && <p className="text-red-500 text-xs mt-1">{editLeadForm.formState.errors.description.message}</p>}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-districtId">District</Label>
                            <Controller
                                control={editLeadForm.control}
                                name="districtId"
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue placeholder="Select a district" /></SelectTrigger>
                                        <SelectContent>
                                            {districts.map(d => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {editLeadForm.formState.errors.districtId && <p className="text-red-500 text-xs mt-1">{editLeadForm.formState.errors.districtId.message}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-expectedSavings">Savings Target</Label>
                            <Input id="edit-expectedSavings" type="number" {...editLeadForm.register('expectedSavings')} />
                            {editLeadForm.formState.errors.expectedSavings && <p className="text-red-500 text-xs mt-1">{editLeadForm.formState.errors.expectedSavings.message}</p>}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Deadline</Label>
                        <Controller
                            control={editLeadForm.control}
                            name="deadline"
                            render={({ field }) => (
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                        >
                                            <Icons.calendar className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={(date) => { if (date) field.onChange(date); setIsCalendarOpen(false); }}
                                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            )}
                        />
                        {editLeadForm.formState.errors.deadline && <p className="text-red-500 text-xs mt-1">{editLeadForm.formState.errors.deadline.message}</p>}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={editLeadForm.formState.isSubmitting}>
                        {editLeadForm.formState.isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the lead titled <span className="font-semibold text-foreground">"{selectedLead?.title}"</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteConfirm} className={cn(buttonVariants({variant: "destructive"}))}>Confirm Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
