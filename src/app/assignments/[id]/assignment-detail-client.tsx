
'use client';

import { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { type SalesLead, type LeadUpdate, type User } from '@prisma/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator, SidebarTrigger } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { addLeadUpdate, logoutAction } from '@/app/actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { ThemeToggle } from '@/components/theme-toggle';

// The client-side type needs to match what the server component constructs
type ClientSalesLead = SalesLead & {
    updates: LeadUpdate[];
    assignee: User | null;
};

const SalesLeadStatusEnum = z.enum([
  'New',
  'Assigned',

'InProgress',
  'Reopened',
  'PendingClosure',
  'PendingDistrictApproval',
  'Closed',
]);

const updateSchema = z.object({
    updateText: z.string().min(5, { message: "Update must be at least 5 characters." }),
    status: SalesLeadStatusEnum,
    generatedSavings: z.coerce.number().min(0, "Savings must be a positive number.").optional(),
});

const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const formatCurrency = (amount: number | any) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(Number(amount));
}

const StatusBadge = ({ status }: { status: SalesLead['status'] }) => {
    const statusConfig = useMemo(() => {
        switch (status) {
            case 'Closed': return { variant: 'success', Icon: Icons.checkCircle2, text: 'Closed' };
            case 'PendingClosure':
            case 'PendingDistrictApproval': return { variant: 'warning', Icon: Icons.hourglass, text: status };
            case 'New': return { variant: 'info', Icon: Icons.filePlus2, text: 'New' };
            case 'Reopened': return { variant: 'warning', Icon: Icons.refreshCw, text: 'Reopened' };
            case 'Assigned': return { variant: 'default', Icon: Icons.arrowRightCircle, text: 'Assigned' };
            case 'InProgress': return { variant: 'default', Icon: Icons.loader, text: 'In Progress' };
            default: return { variant: 'secondary', Icon: Icons.circle, text: status };
        }
    }, [status]);

    const iconClassName = status === 'InProgress' ? 'animate-spin' : '';

    return (
        <Badge variant={statusConfig.variant}>
            <statusConfig.Icon className={cn("h-3 w-3", iconClassName)} />
            <span>{statusConfig.text}</span>
        </Badge>
    );
};

const OnSiteBadge = ({ isOnSite, distance }: { isOnSite: boolean, distance: number }) => {
    const variant = isOnSite ? 'success' : 'destructive';
    const Icon = isOnSite ? Icons.shieldCheck : Icons.shieldAlert;
    const text = isOnSite ? "On-site" : "Off-site";

    return (
        <Badge variant={variant}>
            <Icon className="h-3 w-3" />
            <span>{text} ({distance.toFixed(2)} km away)</span>
        </Badge>
    );
};


export default function AssignmentDetailClient({ user, permissions, lead, distanceThreshold }: { user: User | null, permissions: string[], lead: ClientSalesLead, distanceThreshold: number }) {
  const router = useRouter();
  const { toast } = useToast();

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register: registerUpdate, handleSubmit: handleSubmitUpdate, control: controlUpdate, reset: resetUpdate, formState: { errors: updateErrors } } = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
        updateText: '',
        status: lead.status as any,
        generatedSavings: 0,
    }
  });

  const canViewSettings = useMemo(() => permissions.some(p => p.startsWith('settings:')), [permissions]);

  const fileToDataUrl = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  }

  const onUpdateSubmit = async (data: z.infer<typeof updateSchema>) => {
    setIsSubmitting(true);

    let reportingLat: number | undefined;
    let reportingLng: number | undefined;
    
    const getLocation = () => new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
          return reject(new Error("Geolocation is not supported by your browser."));
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
    });

    try {
        const position = await getLocation();
        reportingLat = position.coords.latitude;
        reportingLng = position.coords.longitude;
    } catch (error) {
        let message = "Could not get your location. Please enable permissions.";
        if (error instanceof GeolocationPositionError) {
            if (error.code === 1) message = "Location permission was denied.";
            if (error.code === 2) message = "Location could not be determined.";
            if (error.code === 3) message = "Location request timed out.";
        }
        toast({
        title: "Location Verification Failed",
        description: `${message} Update will be submitted without location data.`,
        variant: "destructive",
        });
    }
    
    let attachmentUrl;
    if (attachmentFile) {
        try {
            attachmentUrl = await fileToDataUrl(attachmentFile);
        } catch (error) {
            toast({ title: "File Error", description: "Could not read the attached file.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
    }

    try {
        await addLeadUpdate({
            leadId: lead.id,
            updateText: data.updateText,
            status: data.status,
            generatedSavings: data.generatedSavings,
            author: lead.assignee?.name || 'System',
            attachmentUrl,
            reportingLat,
            reportingLng,
        });

        toast({
            title: "Lead Updated",
            description: `Lead "${lead.title}" has been updated.`,
        });
        router.push('/assignments');
    } catch (error) {
        console.error("Failed to update lead:", error);
        toast({
            title: "Update Failed",
            description: "An error occurred while submitting the update.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const officerAllowedStatuses: any[] = ['InProgress', 'PendingClosure'];

  const totalGeneratedSavings = lead.updates.reduce((acc, u) => acc + (Number(u.generatedSavings) || 0), 0);
  const achievementPercentage = Number(lead.expectedSavings) > 0 ? Math.min(100, (totalGeneratedSavings / Number(lead.expectedSavings)) * 100) : 0;
  const isPendingApproval = lead.status === 'PendingClosure' || lead.status === 'PendingDistrictApproval' || lead.status === 'Closed';

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
                        <SidebarMenuButton asChild tooltip="My Assignments" isActive><Link href="/assignments"><Icons.clipboardList /><span>My Assignments</span></Link></SidebarMenuButton>
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
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
                    <Icons.arrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    Lead Details
                </h1>
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
                        <BreadcrumbLink asChild>
                            <Link href="/assignments">My Assignments</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Lead Details</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            
            <Card>
                <CardHeader>
                    <CardTitle>{lead.title}</CardTitle>
                    <CardDescription>{lead.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Separator />
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="font-medium">Assignee</p>
                            <p className="text-muted-foreground">{lead.assignee?.name || 'Unassigned'}</p>
                        </div>
                        <div>
                            <p className="font-medium">Deadline</p>
                            <p className="text-muted-foreground">{lead.deadline ? format(new Date(lead.deadline), "PPP") : 'N/A'}</p>
                        </div>
                        <div>
                            <p className="font-medium">Status</p>
                            <StatusBadge status={lead.status as any} />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <p className="font-medium">Savings Progress ({achievementPercentage.toFixed(0)}%)</p>
                            <Progress value={achievementPercentage} className="my-1 h-2" />
                            <div className="flex justify-between text-xs font-medium">
                                <span className="text-primary">{formatCurrency(totalGeneratedSavings)}</span>
                                <span className="text-muted-foreground">/ {formatCurrency(lead.expectedSavings)}</span>
                            </div>
                        </div>
                    </div>
                    <Separator />

                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Update History</h4>
                        <ScrollArea className="h-48 w-full rounded-md border p-4">
                        {lead.updates.length > 0 ? (
                                <div className="space-y-4">
                                    {lead.updates.map((update, index) => (
                                        <div key={index} className="text-sm">
                                            <p className="font-medium">{update.author} <span className="text-muted-foreground text-xs">on {format(new Date(update.timestamp), "PPp")}</span></p>
                                            <p className="text-muted-foreground">{update.text}</p>
                                            {update.generatedSavings && (
                                                <p className="text-sm text-primary font-medium mt-1">
                                                    + {formatCurrency(update.generatedSavings)}
                                                </p>
                                            )}
                                            {update.attachmentUrl && (
                                                <a 
                                                    href={update.attachmentUrl} 
                                                    download
                                                    className="flex items-center gap-2 mt-2 text-sm text-primary hover:underline"
                                                >
                                                    <Icons.file className="h-4 w-4" />
                                                    <span>View Attachment</span>
                                                </a>
                                            )}
                                            {update.reportingLat && update.reportingLng && lead.lat && lead.lng && (() => {
                                                const distance = getDistanceInKm(Number(lead.lat), Number(lead.lng), update.reportingLat!, update.reportingLng!);
                                                const isOnSite = distance < distanceThreshold;
                                                return (
                                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                                        <Icons.locateFixed className="h-4 w-4" />
                                                        <a 
                                                            href={`https://www.google.com/maps/search/?api=1&query=${update.reportingLat},${update.reportingLng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hover:underline"
                                                        >
                                                            Reported from location
                                                        </a>
                                                        <OnSiteBadge isOnSite={isOnSite} distance={distance} />
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    ))}
                                </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No updates yet.</p>
                        )}
                        </ScrollArea>
                    </div>

                    <Separator />
                     <form onSubmit={handleSubmitUpdate(onUpdateSubmit)} className="space-y-4">
                        <h4 className="text-sm font-semibold">Add New Update</h4>
                         <div>
                            <Label htmlFor="updateText">Update Details</Label>
                            <Textarea id="updateText" {...registerUpdate("updateText")} disabled={isPendingApproval} />
                            {updateErrors.updateText && <p className="text-red-500 text-xs mt-1">{updateErrors.updateText.message}</p>}
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="status">New Status</Label>
                                 <Controller
                                    control={controlUpdate}
                                    name="status"
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value as string} disabled={isPendingApproval}>
                                            <SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger>
                                            <SelectContent>
                                                {isPendingApproval ? (
                                                    <SelectItem value={lead.status}>{lead.status}</SelectItem>
                                                ) : (
                                                    officerAllowedStatuses.map(status => (<SelectItem key={status} value={status}>{status}</SelectItem>))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {updateErrors.status && <p className="text-red-500 text-xs mt-1">{updateErrors.status.message}</p>}
                            </div>
                             <div>
                                <Label htmlFor="generatedSavings">Generated Savings (Optional)</Label>
                                <Input id="generatedSavings" type="number" {...registerUpdate("generatedSavings")} disabled={isPendingApproval} />
                                {updateErrors.generatedSavings && <p className="text-red-500 text-xs mt-1">{updateErrors.generatedSavings.message}</p>}
                             </div>
                         </div>
                         <div>
                            <Label htmlFor="attachment">Attachment (Optional)</Label>
                            <Input 
                                id="attachment" 
                                type="file" 
                                onChange={(e) => setAttachmentFile(e.target.files ? e.target.files[0] : null)}
                                disabled={isPendingApproval}
                            />
                        </div>
                        <CardFooter className="px-0 pt-4">
                            <Button type="button" variant="outline" onClick={() => router.push('/assignments')}>Cancel</Button>
                            <Button type="submit" className="ml-auto" disabled={isSubmitting || isPendingApproval}>
                                {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                                {isSubmitting ? 'Submitting...' : (isPendingApproval ? 'Pending Approval' : 'Submit Update')}
                            </Button>
                        </CardFooter>
                     </form>
                </CardContent>
                </Card>
            
            </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

    

    