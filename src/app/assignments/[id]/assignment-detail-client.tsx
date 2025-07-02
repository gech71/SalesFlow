
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
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { addLeadUpdate, logoutAction } from '@/app/actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

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
})

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
  };

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
  };

  const officerAllowedStatuses: any[] = ['InProgress', 'PendingClosure'];

  const getStatusBadgeVariant = (status: SalesLead['status']) => {
    switch (status) {
      case 'New': return 'info';
      case 'Assigned': return 'secondary';
      case 'Reopened': return 'warning';
      case 'InProgress': return 'outline';
      case 'PendingClosure': return 'warning';
      case 'PendingDistrictApproval': return 'warning';
      case 'Closed': return 'success';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: SalesLead['status']) => {
    const iconClass = "h-3.5 w-3.5";
    switch (status) {
        case 'Closed': return <Icons.check className={iconClass} />;
        case 'PendingClosure':
        case 'PendingDistrictApproval':
        case 'InProgress': return <Icons.spinner className={cn(iconClass, "animate-spin")} />;
        case 'Reopened': return <Icons.edit className={iconClass} />;
        case 'Assigned': return <Icons.clipboardList className={iconClass} />;
        case 'New': return <Icons.plusCircle className={iconClass} />;
        default: return null;
    }
  };

  const formatCurrency = (amount: number | any) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  };

  const totalGeneratedSavings = lead.updates.reduce((acc, u) => acc + (Number(u.generatedSavings) || 0), 0);
  const achievementPercentage = Number(lead.expectedSavings) > 0 ? Math.min(100, (totalGeneratedSavings / Number(lead.expectedSavings)) * 100) : 0;
  const isPendingApproval = lead.status === 'PendingClosure' || lead.status === 'PendingDistrictApproval' || lead.status === 'Closed';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
            <div className="flex items-center gap-2 justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://play-lh.googleusercontent.com/bXqMt9ROsGd0H9vPhib5hG-0NB-EJcAwZy6UUDhvlP-ykE595IMQtzr14R6IRWtJiGTh=w600-h300-pc0xffffff-pd" alt="NIB International Bank Logo" className="h-8 w-auto" />
                <span className="font-semibold text-lg">Nib Sales</span>
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
                        <Link href="/assignments"><SidebarMenuButton isActive><Icons.clipboardList className="mr-2" />My Assignments</SidebarMenuButton></Link>
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
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => router.back()}>
                    <Icons.arrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    Lead Details
                </h1>
            </div>
            
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
                            <Badge variant={getStatusBadgeVariant(lead.status as any)}>
                                {getStatusIcon(lead.status as any)}
                                {lead.status}
                            </Badge>
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
                                                    <div className="flex items-center gap-2 mt-2 text-xs">
                                                        <a 
                                                            href={`https://www.google.com/maps/search/?api=1&query=${update.reportingLat},${update.reportingLng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1.5 text-muted-foreground hover:underline"
                                                        >
                                                            <Icons.locateFixed className="h-4 w-4" />
                                                            <span>Reported from location</span>
                                                        </a>
                                                        <Badge variant={isOnSite ? 'success' : 'destructive'}>
                                                            {isOnSite ? <Icons.check className="h-3.5 w-3.5" /> : <Icons.alertTriangle className="h-3.5 w-3.5" />}
                                                            {isOnSite ? "On-site" : "Off-site"}
                                                        </Badge>
                                                        <span className="text-muted-foreground">({distance.toFixed(2)} km away)</span>
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
