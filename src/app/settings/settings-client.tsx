'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { updateSetting, registerUser, updateUserRole, saveRole, deleteRole, updateUserAssignment, updateCreatableRoles, updateUser, deleteUser as deleteUserAction } from '@/app/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { User, Role, District, Branch } from '@prisma/client';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import AppSidebar from '@/components/app-sidebar';
import { cn } from '@/lib/utils';

const settingsSchema = z.object({
  threshold: z.coerce.number().min(0, { message: "Distance must be a positive number." }),
});

const registerUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().regex(/^(\+251|0)?[79]\d{8}$/, 'Invalid Ethiopian phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.string().min(1, 'A role must be selected'),
});

const updateUserSchema = z.object({
  userId: z.string(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().regex(/^(\+251|0)?[79]\d{8}$/, 'Invalid Ethiopian phone number'),
});

const roleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Role name is required'),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

const permissionGroups = [
    {
        title: 'Dashboard',
        permissions: [{ id: 'dashboard:read', label: 'View sales dashboard' }],
    },
    {
        title: 'My Assignments',
        permissions: [
            { id: 'assignments:read_own', label: 'View own assigned leads' },
            { id: 'assignments:update_own', label: 'Update own assigned leads' },
        ],
    },
    {
        title: 'District View',
        permissions: [
            { id: 'district_assignments:read', label: 'View leads at district level' },
            { id: 'district_assignments:create_lead', label: 'Create new leads' },
            { id: 'district_assignments:assign_branch', label: 'Assign leads to branches' },
            { id: 'district_assignments:approve', label: 'Approve/rework leads for final closure' },
            { id: 'district_assignments:edit_lead', label: 'Edit new leads' },
            { id: 'district_assignments:delete_lead', label: 'Delete new leads' },
        ],
    },
    {
        title: 'Branch View',
        permissions: [
            { id: 'branch_assignments:read', label: 'View leads at branch level' },
            { id: 'branch_assignments:assign_officer', label: 'Assign leads to officers' },
            { id: 'branch_assignments:approve', label: 'Approve/rework leads for district review' },
        ],
    },
    {
        title: 'Branch Savings Plans',
        permissions: [
            { id: 'branch_plans:read', label: 'View branch savings plans' },
            { id: 'branch_plans:review', label: 'Review (approve/reject) plan entries' },
            { id: 'branch_plans:create_entry', label: 'Submit collection/withdrawal entries' },
        ],
    },
    {
        title: 'Off-site Reports',
        permissions: [{ id: 'offsite_reports:read', label: 'View off-site reporting violations' }],
    },
    {
        title: 'Settings',
        permissions: [
            { id: 'settings:manage_users', label: 'Manage users and their assignments' },
            { id: 'settings:manage_roles', label: 'Manage roles and permissions' },
            { id: 'settings:manage_reporting', label: 'Manage reporting settings (e.g., distance threshold)' },
            { id: 'settings:manage_creation', label: 'Manage user creation permissions by role' },
        ],
    },
];


type ClientRole = Role & { creatableRoles: string[] };
type ClientUser = User & { role: ClientRole, district: District | null, branch: Branch | null };
type ClientDistrict = District & { branches: Branch[] };

export default function SettingsClient({ loggedInUser, permissions, threshold, users, roles, districts }: { loggedInUser: ClientUser | null, permissions: string[], threshold: number, users: ClientUser[], roles: ClientRole[], districts: ClientDistrict[] }) {
  const { toast } = useToast();
  
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ClientUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<ClientUser | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [creatableRolesMap, setCreatableRolesMap] = useState<Record<string, string[]>>({});
  const [isSavingCreatableRoles, setIsSavingCreatableRoles] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  const { register: registerSettings, handleSubmit: handleSubmitSettings, reset: resetSettings, formState: { errors: settingsErrors, isSubmitting: isSubmittingSettings } } = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { threshold }
  });

  const { register: registerNewUser, handleSubmit: handleSubmitNewUser, reset: resetNewUser, control: controlNewUser, formState: { errors: newUserErrors, isSubmitting: isSubmittingNewUser } } = useForm<z.infer<typeof registerUserSchema>>({
    resolver: zodResolver(registerUserSchema),
  });
  
  const editUserForm = useForm<z.infer<typeof updateUserSchema>>({
    resolver: zodResolver(updateUserSchema),
  });

  const { register: registerRole, handleSubmit: handleSubmitRole, reset: resetRole, control: controlRole, formState: { errors: roleErrors, isSubmitting: isSubmittingRole } } = useForm<z.infer<typeof roleSchema>>({
    resolver: zodResolver(roleSchema),
  });
  
  const creatableRolesForCurrentUser = useMemo(() => {
    if (!loggedInUser || !loggedInUser.role || !loggedInUser.role.creatableRoles) {
        return [];
    }
    const creatableRoleNames = loggedInUser.role.creatableRoles;
    return roles.filter(role => creatableRoleNames.includes(role.name));
  }, [loggedInUser, roles]);

  useEffect(() => {
    resetSettings({ threshold });
  }, [threshold, resetSettings]);

  useEffect(() => {
    const initialMap = roles.reduce((acc, role) => {
        acc[role.id] = role.creatableRoles || [];
        return acc;
    }, {} as Record<string, string[]>);
    setCreatableRolesMap(initialMap);
  }, [roles]);

  const onSettingsSubmit = async (data: z.infer<typeof settingsSchema>) => {
    try {
      await updateSetting({ key: 'offsiteDistanceThreshold', value: data.threshold.toString() });
      toast({ title: "Settings Saved", description: "Your new settings have been applied." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    }
  };

  const onNewUserSubmit = async (data: z.infer<typeof registerUserSchema>) => {
    const result = await registerUser(data);
    if (result.success) {
      toast({ title: "User Registered", description: "The new user has been created successfully." });
      setIsUserDialogOpen(false);
      resetNewUser();
    } else {
      toast({ title: "Registration Failed", description: result.error, variant: "destructive" });
    }
  }

  const handleOpenEditDialog = (user: ClientUser) => {
    setEditingUser(user);
    editUserForm.reset({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
    });
  };

  const onEditUserSubmit = async (data: z.infer<typeof updateUserSchema>) => {
    const result = await updateUser(data);
    if (result.success) {
        toast({ title: "User Updated", description: "User details have been saved successfully." });
        setEditingUser(null);
    } else {
        toast({ title: "Update Failed", description: result.error, variant: "destructive" });
    }
  };
  
  const onConfirmDelete = async () => {
    if (!deletingUser) return;
    const result = await deleteUserAction(deletingUser.id);
    if (result.success) {
        toast({ title: "User Deleted", description: `${deletingUser.name} has been removed from the system.` });
    } else {
        toast({ title: "Deletion Failed", description: result.error, variant: "destructive" });
    }
    setDeletingUser(null);
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
        await updateUserRole(userId, roleId);
        toast({ title: "Role Updated", description: "User's role has been changed. Please set new assignments if required." });
    } catch (error) {
        toast({ title: "Error", description: "Failed to update user role.", variant: "destructive" });
    }
  }

  const handleAssignmentChange = async (userId: string, districtId?: string, branchId?: string) => {
    try {
      await updateUserAssignment(userId, districtId || null, branchId || null);
      toast({ title: "Assignment Updated", description: "User's assignment has been saved." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save assignment.", variant: "destructive" });
    }
  }
  
  const openRoleDialog = (role: Role | null) => {
    if (role) {
      setEditingRole(role);
      resetRole(role);
    } else {
      setEditingRole(null);
      resetRole({ name: '', description: '', permissions: [] });
    }
    setIsRoleDialogOpen(true);
  }

  const onRoleSubmit = async (data: z.infer<typeof roleSchema>) => {
    try {
      await saveRole(data);
      toast({ title: "Role Saved", description: `Role "${data.name}" has been saved.` });
      setIsRoleDialogOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save role.", variant: "destructive" });
    }
  }

  const onDeleteRole = async (roleId: string) => {
    if (confirm("Are you sure you want to delete this role? This cannot be undone.")) {
      try {
        await deleteRole(roleId);
        toast({ title: "Role Deleted", description: "The role has been successfully deleted." });
      } catch (error: any) {
        toast({ title: "Error Deleting Role", description: error.message, variant: "destructive" });
      }
    }
  }
  
  const handleCreatableRoleChange = (roleId: string, creatableRoleName: string, isChecked: boolean) => {
      setCreatableRolesMap(prev => {
          const currentCreatable = prev[roleId] || [];
          const newCreatable = isChecked
              ? [...new Set([...currentCreatable, creatableRoleName])]
              : currentCreatable.filter(name => name !== creatableRoleName);
          return { ...prev, [roleId]: newCreatable };
      });
  };

  const handleSaveCreatableRoles = async () => {
      setIsSavingCreatableRoles(true);
      try {
          await updateCreatableRoles(creatableRolesMap);
          toast({ title: "Permissions Saved", description: "Role creation permissions have been updated." });
      } catch (error) {
          toast({ title: "Error", description: "Failed to save permissions.", variant: "destructive" });
      } finally {
          setIsSavingCreatableRoles(false);
      }
  };


  const renderAssignmentControls = (user: ClientUser) => {
    const roleName = roles.find(r => r.id === user.roleId)?.name;

    switch (roleName) {
        case 'DISTRICT_MANAGER':
            return (
                <Select 
                    defaultValue={user.districtId || 'none'} 
                    onValueChange={(districtId) => handleAssignmentChange(user.id, districtId === 'none' ? undefined : districtId, undefined)}
                >
                    <SelectTrigger><SelectValue placeholder="Assign District..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            );
        case 'BRANCH_MANAGER':
        case 'OFFICER':
            return (
                 <div className="flex flex-col sm:flex-row gap-2">
                    <Select 
                        defaultValue={user.districtId || 'none'} 
                        onValueChange={(districtId) => handleAssignmentChange(user.id, districtId === 'none' ? undefined : districtId, undefined)}
                    >
                        <SelectTrigger><SelectValue placeholder="Assign District..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select 
                        defaultValue={user.branchId || 'none'} 
                        onValueChange={(branchId) => handleAssignmentChange(user.id, user.districtId, branchId === 'none' ? undefined : branchId)} 
                        disabled={!user.districtId}
                    >
                        <SelectTrigger><SelectValue placeholder="Assign Branch..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {user.districtId && districts.find(d => d.id === user.districtId)?.branches.map(b => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        default:
            return <div className="text-sm text-muted-foreground italic">N/A</div>;
    }
}

  return (
    <SidebarProvider>
      <AppSidebar user={loggedInUser} permissions={permissions} />
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col">
          <header className="sticky top-0 z-10 flex flex-col gap-4 border-b bg-background/95 p-4 backdrop-blur-sm md:px-6">
            <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="flex-1 text-xl font-semibold tracking-tight">Settings</h1>
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
                        <BreadcrumbPage>Settings</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <Tabs defaultValue="users" className="w-full">
                <TabsList className="mx-auto grid w-full grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-4 md:max-w-3xl">
                    {permissions.includes('settings:manage_users') && <TabsTrigger value="users">User Management</TabsTrigger>}
                    {permissions.includes('settings:manage_roles') && <TabsTrigger value="roles">Role Permissions</TabsTrigger>}
                    {permissions.includes('settings:manage_creation') && <TabsTrigger value="creation">Creation Permissions</TabsTrigger>}
                    {permissions.includes('settings:manage_reporting') && <TabsTrigger value="reporting">Reporting</TabsTrigger>}
                </TabsList>
                
                {permissions.includes('settings:manage_reporting') && (
                    <TabsContent value="reporting" className="mt-8">
                        <div className="grid max-w-2xl gap-6">
                            <Card>
                                <form onSubmit={handleSubmitSettings(onSettingsSubmit)}>
                                    <CardHeader><CardTitle>Reporting Settings</CardTitle><CardDescription>Manage settings related to lead reporting and validation.</CardDescription></CardHeader>
                                    <CardContent>
                                        <div className="grid gap-2">
                                            <Label htmlFor="threshold">On-site Distance Threshold (km)</Label>
                                            <Input id="threshold" type="number" step="0.1" {...registerSettings("threshold")} disabled={isSubmittingSettings} />
                                            <p className="text-sm text-muted-foreground">Updates submitted further than this distance from the lead's location will be flagged as "Off-site".</p>
                                            {settingsErrors.threshold && <p className="text-red-500 text-xs mt-1">{settingsErrors.threshold.message}</p>}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="border-t px-6 py-4">
                                        <Button type="submit" disabled={isSubmittingSettings}>{isSubmittingSettings && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}Save Settings</Button>
                                    </CardFooter>
                                </form>
                            </Card>
                        </div>
                    </TabsContent>
                )}

                {permissions.includes('settings:manage_users') && (
                    <TabsContent value="users" className="mt-8">
                        <Card>
                            <CardHeader className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                                <div><CardTitle>Users</CardTitle><CardDescription>Manage user accounts, their roles, and their branch/district assignments.</CardDescription></div>
                                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                                    <DialogTrigger asChild><Button><Icons.plusCircle className="mr-2 h-4 w-4" />Register User</Button></DialogTrigger>
                                    <DialogContent className="sm:max-w-lg">
                                        <form onSubmit={handleSubmitNewUser(onNewUserSubmit)}>
                                            <DialogHeader><DialogTitle>Register New User</DialogTitle><DialogDescription>Create a new user account in the authentication service and in this application.</DialogDescription></DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div><Label htmlFor="firstName">First Name</Label><Input id="firstName" {...registerNewUser("firstName")} />{newUserErrors.firstName && <p className="text-destructive text-xs mt-1">{newUserErrors.firstName.message}</p>}</div>
                                                    <div><Label htmlFor="lastName">Last Name</Label><Input id="lastName" {...registerNewUser("lastName")} />{newUserErrors.lastName && <p className="text-destructive text-xs mt-1">{newUserErrors.lastName.message}</p>}</div>
                                                </div>
                                                <div><Label htmlFor="email">Email</Label><Input id="email" type="email" {...registerNewUser("email")} />{newUserErrors.email && <p className="text-destructive text-xs mt-1">{newUserErrors.email.message}</p>}</div>
                                                <div><Label htmlFor="phoneNumber">Phone Number</Label><Input id="phoneNumber" {...registerNewUser("phoneNumber")} />{newUserErrors.phoneNumber && <p className="text-destructive text-xs mt-1">{newUserErrors.phoneNumber.message}</p>}</div>
                                                <div>
                                                  <Label htmlFor="password">Password</Label>
                                                  <div className="relative">
                                                      <Input 
                                                          id="password" 
                                                          type={showPassword ? 'text' : 'password'} 
                                                          {...registerNewUser("password")} 
                                                          className="pr-10"
                                                      />
                                                      <button
                                                          type="button"
                                                          onClick={() => setShowPassword(!showPassword)}
                                                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                                                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                      >
                                                          {showPassword ? <Icons.eyeOff className="h-5 w-5" /> : <Icons.eye className="h-5 w-5" />}
                                                      </button>
                                                  </div>
                                                  {newUserErrors.password && <p className="text-destructive text-xs mt-1">{newUserErrors.password.message}</p>}
                                                </div>
                                                <div>
                                                    <Label htmlFor="roleId">Role</Label>
                                                    <Controller control={controlNewUser} name="roleId" render={({ field }) => (
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                                                            <SelectContent>{creatableRolesForCurrentUser.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    )} />
                                                    {newUserErrors.roleId && <p className="text-destructive text-xs mt-1">{newUserErrors.roleId.message}</p>}
                                                </div>
                                            </div>
                                            <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={isSubmittingNewUser}>{isSubmittingNewUser && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}Register</Button></DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                {/* Desktop Table */}
                                <div className="hidden md:block">
                                  <Table>
                                      <TableHeader><TableRow><TableHead>User</TableHead><TableHead className="w-[180px]">Role</TableHead><TableHead className="w-[40%]">Assignment</TableHead><TableHead className="w-[80px] text-right">Actions</TableHead></TableRow></TableHeader>
                                      <TableBody>
                                          {users.map(user => (
                                              <TableRow key={user.id}>
                                                  <TableCell>
                                                      <div className="font-medium truncate">{user.name}</div>
                                                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                                      <div className="text-xs text-muted-foreground truncate">{user.phoneNumber}</div>
                                                  </TableCell>
                                                  <TableCell>
                                                      <Select
                                                          defaultValue={user.roleId}
                                                          onValueChange={(roleId) => handleRoleChange(user.id, roleId)}
                                                          disabled={user.id === loggedInUser?.id}
                                                      >
                                                          <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                                                          <SelectContent>
                                                              {creatableRolesForCurrentUser.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                                          </SelectContent>
                                                      </Select>
                                                  </TableCell>
                                                  <TableCell>
                                                      {renderAssignmentControls(user)}
                                                  </TableCell>
                                                  <TableCell className="text-right">
                                                    {user.id !== loggedInUser?.id && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon">
                                                                    <Icons.moreHorizontal className="h-4 w-4" />
                                                                    <span className="sr-only">User Actions</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onSelect={() => handleOpenEditDialog(user)}>
                                                                    <Icons.edit className="mr-2 h-4 w-4" />
                                                                    <span>Edit User</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => setDeletingUser(user)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                                    <Icons.trash className="mr-2 h-4 w-4" />
                                                                    <span>Delete User</span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                  </TableCell>
                                              </TableRow>
                                          ))}
                                      </TableBody>
                                  </Table>
                                </div>
                                {/* Mobile Cards */}
                                <div className="grid gap-4 md:hidden">
                                  {users.map(user => (
                                    <Card key={user.id}>
                                      <CardHeader>
                                        <CardTitle>{user.name}</CardTitle>
                                        <CardDescription>{user.email}</CardDescription>
                                        <CardDescription>{user.phoneNumber}</CardDescription>
                                      </CardHeader>
                                      <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                          <Label>Role</Label>
                                          <Select defaultValue={user.roleId} onValueChange={(roleId) => handleRoleChange(user.id, roleId)} disabled={user.id === loggedInUser?.id}>
                                            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                                            <SelectContent>
                                                {creatableRolesForCurrentUser.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Assignment</Label>
                                          {renderAssignmentControls(user)}
                                        </div>
                                      </CardContent>
                                       {user.id !== loggedInUser?.id && (
                                        <CardFooter className="flex gap-2">
                                            <Button variant="outline" className="w-full" onClick={() => handleOpenEditDialog(user)}>
                                                <Icons.edit className="mr-2 h-4 w-4"/> Edit
                                            </Button>
                                            <Button variant="destructive" className="w-full" onClick={() => setDeletingUser(user)}>
                                                <Icons.trash className="mr-2 h-4 w-4"/> Delete
                                            </Button>
                                        </CardFooter>
                                       )}
                                    </Card>
                                  ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {permissions.includes('settings:manage_roles') && (
                    <TabsContent value="roles" className="mt-8">
                        <Card>
                            <CardHeader className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                                <div><CardTitle>Role Permissions</CardTitle><CardDescription>Define roles and their functional permissions within the application.</CardDescription></div>
                                <Button onClick={() => openRoleDialog(null)}><Icons.plusCircle className="mr-2 h-4 w-4" />Create Role</Button>
                            </CardHeader>
                            <CardContent>
                                {/* Desktop Table */}
                                <div className="hidden md:block">
                                  <Table>
                                      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead>Permissions</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                      <TableBody>
                                          {roles.map(role => (
                                              <TableRow key={role.id}>
                                                  <TableCell className="font-medium truncate">{role.name}</TableCell>
                                                  <TableCell className="text-muted-foreground truncate">{role.description}</TableCell>
                                                  <TableCell><div className="flex flex-wrap gap-1">{role.permissions.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}</div></TableCell>
                                                  <TableCell className="text-right space-x-2">
                                                      <Button variant="ghost" size="icon" onClick={() => openRoleDialog(role)}><Icons.edit className="h-4 w-4" /></Button>
                                                      <Button variant="ghost" size="icon" onClick={() => onDeleteRole(role.id)}><Icons.trash className="h-4 w-4" /></Button>
                                                  </TableCell>
                                              </TableRow>
                                          ))}
                                      </TableBody>
                                  </Table>
                                </div>
                                {/* Mobile Cards */}
                                <div className="grid gap-4 md:hidden">
                                  {roles.map(role => (
                                    <Card key={role.id}>
                                      <CardHeader>
                                        <div className="flex justify-between items-start gap-2">
                                          <div className="flex-1">
                                            <CardTitle>{role.name}</CardTitle>
                                            <CardDescription>{role.description}</CardDescription>
                                          </div>
                                          <div className="flex">
                                            <Button variant="ghost" size="icon" onClick={() => openRoleDialog(role)}><Icons.edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => onDeleteRole(role.id)}><Icons.trash className="h-4 w-4" /></Button>
                                          </div>
                                        </div>
                                      </CardHeader>
                                      <CardContent>
                                        <Label>Permissions</Label>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {role.permissions.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                                          {role.permissions.length === 0 && <p className="text-xs text-muted-foreground">No permissions assigned.</p>}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
                
                {permissions.includes('settings:manage_creation') && (
                    <TabsContent value="creation" className="mt-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Role Creation Permissions</CardTitle>
                                <CardDescription>Configure which roles are allowed to create other user roles.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {roles.map(role => (
                                    <div key={role.id}>
                                        <h4 className="font-semibold">{role.name}</h4>
                                        <p className="text-sm text-muted-foreground">Can create the following roles:</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                                            {roles.map(creatableRole => (
                                                <div key={creatableRole.id} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`perm-${role.id}-${creatableRole.id}`}
                                                        checked={creatableRolesMap[role.id]?.includes(creatableRole.name)}
                                                        onCheckedChange={(checked) => handleCreatableRoleChange(role.id, creatableRole.name, !!checked)}
                                                    />
                                                    <Label htmlFor={`perm-${role.id}-${creatableRole.id}`}>{creatableRole.name}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter className="border-t px-6 py-4">
                                <Button onClick={handleSaveCreatableRoles} disabled={isSavingCreatableRoles}>
                                    {isSavingCreatableRoles && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Creation Permissions
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>
                )}

            </Tabs>
          </main>
        </div>
      </SidebarInset>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-lg">
            <form onSubmit={editUserForm.handleSubmit(onEditUserSubmit)}>
                <DialogHeader><DialogTitle>Edit User Details</DialogTitle><DialogDescription>Update the personal information for {editingUser?.name}. Role and assignment are managed on the main settings page.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                    <input type="hidden" {...editUserForm.register('userId')} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><Label htmlFor="edit-firstName">First Name</Label><Input id="edit-firstName" {...editUserForm.register("firstName")} />{editUserForm.formState.errors.firstName && <p className="text-destructive text-xs mt-1">{editUserForm.formState.errors.firstName.message}</p>}</div>
                        <div><Label htmlFor="edit-lastName">Last Name</Label><Input id="edit-lastName" {...editUserForm.register("lastName")} />{editUserForm.formState.errors.lastName && <p className="text-destructive text-xs mt-1">{editUserForm.formState.errors.lastName.message}</p>}</div>
                    </div>
                    <div><Label htmlFor="edit-email">Email</Label><Input id="edit-email" type="email" {...editUserForm.register("email")} />{editUserForm.formState.errors.email && <p className="text-destructive text-xs mt-1">{editUserForm.formState.errors.email.message}</p>}</div>
                    <div><Label htmlFor="edit-phoneNumber">Phone Number</Label><Input id="edit-phoneNumber" {...editUserForm.register("phoneNumber")} />{editUserForm.formState.errors.phoneNumber && <p className="text-destructive text-xs mt-1">{editUserForm.formState.errors.phoneNumber.message}</p>}</div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                    <Button type="submit" disabled={editUserForm.formState.isSubmitting}>{editUserForm.formState.isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the user account for <span className="font-semibold text-foreground">{deletingUser?.name}</span> and remove all associated data.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirmDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Confirm Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
            <form onSubmit={handleSubmitRole(onRoleSubmit)}>
                <DialogHeader><DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle><DialogDescription>Set the details and permissions for this role.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                    <input type="hidden" {...registerRole("id")} />
                    <div><Label htmlFor="roleName">Role Name</Label><Input id="roleName" {...registerRole("name")} />{roleErrors.name && <p className="text-destructive text-xs mt-1">{roleErrors.name.message}</p>}</div>
                    <div><Label htmlFor="roleDescription">Description</Label><Textarea id="roleDescription" {...registerRole("description")} /></div>
                    <div>
                        <Label>Permissions</Label>
                        <Card className="mt-2 max-h-64 overflow-y-auto">
                            <CardContent className="p-4 space-y-4">
                                <Controller
                                    control={controlRole}
                                    name="permissions"
                                    render={({ field }) => (
                                        <>
                                            {permissionGroups.map((group) => {
                                                const allGroupPermissions = group.permissions.map(p => p.id);
                                                const selectedPermissions = field.value || [];
                                                const areAllSelected = allGroupPermissions.every(p => selectedPermissions.includes(p));
                                                const areSomeSelected = allGroupPermissions.some(p => selectedPermissions.includes(p));

                                                const handleGroupCheck = (checked: boolean | 'indeterminate') => {
                                                    const currentPermissions = field.value || [];
                                                    if (checked) {
                                                        const newPermissions = [...new Set([...currentPermissions, ...allGroupPermissions])];
                                                        field.onChange(newPermissions);
                                                    } else {
                                                        const newPermissions = currentPermissions.filter(p => !allGroupPermissions.includes(p));
                                                        field.onChange(newPermissions);
                                                    }
                                                };

                                                return (
                                                    <div key={group.title} className="space-y-3">
                                                        <div className="flex items-center space-x-3">
                                                            <Checkbox
                                                                id={`group-${group.title.replace(/\s+/g, '-')}`}
                                                                checked={areAllSelected ? true : areSomeSelected ? 'indeterminate' : false}
                                                                onCheckedChange={handleGroupCheck}
                                                            />
                                                            <label
                                                                htmlFor={`group-${group.title.replace(/\s+/g, '-')}`}
                                                                className="font-medium text-sm text-foreground leading-none"
                                                            >
                                                                {group.title}
                                                            </label>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 pl-8">
                                                            {group.permissions.map((p) => (
                                                                <div key={p.id} className="flex items-center space-x-3">
                                                                    <Checkbox
                                                                        id={`perm-${p.id}`}
                                                                        checked={field.value?.includes(p.id)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...(field.value || []), p.id])
                                                                                : field.onChange(field.value?.filter((v) => v !== p.id));
                                                                        }}
                                                                    />
                                                                    <label
                                                                        htmlFor={`perm-${p.id}`}
                                                                        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                                    >
                                                                        {p.label}
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
                <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={isSubmittingRole}>{isSubmittingRole && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}Save Role</Button></DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
