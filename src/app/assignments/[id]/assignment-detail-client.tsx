
'use client';

import { useState, useEffect } from 'react';
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
import { type SalesLead, type LeadUpdate, type Officer, LeadStatus } from '@prisma/client';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { addLeadUpdate } from '@/app/actions';

// The client-side type needs to match what the server component constructs
type ClientSalesLead = SalesLead & {
    location: { lat: number; lng: number };
    updates: LeadUpdate[];
    officer: Officer | null;
};

const updateSchema = z.object({
    updateText: z.string().min(5, { message: "Update must be at least 5 characters." }),
    status: z.nativeEnum(LeadStatus),
    generatedSavings: z.coerce.number().min(0, "Savings must be a positive number.").optional(),
})

export default function AssignmentDetailClient({ lead }: { lead: ClientSalesLead }) {
  const router = useRouter();
  const { toast } = useToast();

  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [distanceThreshold, setDistanceThreshold] = useState(1);
  
  const { register: registerUpdate, handleSubmit: handleSubmitUpdate, control: controlUpdate, reset: resetUpdate, formState: { errors: updateErrors } } = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
        updateText: '',
        status: lead.status,
        generatedSavings: 0,
    }
  });

  useEffect(() => {
    const storedThreshold = localStorage.getItem('offsiteDistanceThreshold');
    if (storedThreshold) {
        const parsedThreshold = parseFloat(storedThreshold);
        if (!isNaN(parsedThreshold)) {
            setDistanceThreshold(parsedThreshold);
        }
    }
  }, []);

  const fileToDataUrl = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
      });
  }

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

    let reportingLocation: { lat: number; lng: number } | undefined;
    
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
        reportingLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        };
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
    
    let attachmentData;
    if (attachmentFile) {
        try {
            const dataUrl = await fileToDataUrl(attachmentFile);
            attachmentData = {
                name: attachmentFile.name,
                dataUrl: dataUrl
            }
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
            author: lead.officer?.name || 'System',
            attachment: attachmentData,
            reportingLocation,
        });

        toast({
            title: "Lead Updated",
            description: `Lead "${lead.title}" has been updated.`,
        });
        router.push('/');
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

  const officerAllowedStatuses: LeadStatus[] = ['InProgress', 'PendingClosure'];

  const getStatusBadgeVariant = (status: SalesLead['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'New': return 'default';
      case 'Assigned': return 'secondary';
      case 'Reopened': return 'secondary';
      case 'InProgress': return 'outline';
      case 'PendingClosure': return 'destructive';
      case 'PendingDistrictApproval': return 'destructive';
      case 'Closed': return 'default';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount: number | any) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  }

  const totalGeneratedSavings = lead.updates.reduce((acc, u) => acc + (Number(u.generatedSavings) || 0), 0);
  const achievementPercentage = Number(lead.expectedSavings) > 0 ? Math.min(100, (totalGeneratedSavings / Number(lead.expectedSavings)) * 100) : 0;
  const isPendingApproval = lead.status === 'PendingClosure' || lead.status === 'PendingDistrictApproval' || lead.status === 'Closed';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
                <Icons.workflow className="w-6 h-6 text-primary" />
                <h2 className="font-semibold text-lg">SalesFlow</h2>
            </div>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                 <SidebarMenuItem>
                    <Link href="/dashboard"><SidebarMenuButton><Icons.dashboard className="mr-2" />Dashboard</SidebarMenuButton></Link>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <Link href="/"><SidebarMenuButton isActive><Icons.clipboardList className="mr-2" />My Assignments</SidebarMenuButton></Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/branch-plans"><SidebarMenuButton><Icons.landmark className="mr-2" />Branch Plans</SidebarMenuButton></Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/submit-entry"><SidebarMenuButton><Icons.plusCircle className="mr-2" />Submit Entry</SidebarMenuButton></Link>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <Link href="/district-assignments"><SidebarMenuButton><Icons.building className="mr-2" />District View</SidebarMenuButton></Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/branch-assignments"><SidebarMenuButton><Icons.building2 className="mr-2" />Branch View</SidebarMenuButton></Link>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <Link href="/offsite-reports"><SidebarMenuButton><Icons.alertTriangle className="mr-2" />Off-site Reports</SidebarMenuButton></Link>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <Link href="/settings"><SidebarMenuButton><Icons.settings className="mr-2" />Settings</SidebarMenuButton></Link>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarContent>
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
                            <p className="text-muted-foreground">{lead.officer?.name || 'Unassigned'}</p>
                        </div>
                        <div>
                            <p className="font-medium">Deadline</p>
                            <p className="text-muted-foreground">{lead.deadline ? format(new Date(lead.deadline), "PPP") : 'N/A'}</p>
                        </div>
                        <div>
                            <p className="font-medium">Status</p>
                            <Badge variant={getStatusBadgeVariant(lead.status)}>{lead.status}</Badge>
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
                                    {lead.updates.map((update, index) => {
                                        const attachment = update.attachmentJson ? JSON.parse(update.attachmentJson as string) : null;
                                        const reportingLocation = update.reportingLocationJson ? JSON.parse(update.reportingLocationJson as string) : null;

                                        return (
                                        <div key={index} className="text-sm">
                                            <p className="font-medium">{update.author} <span className="text-muted-foreground text-xs">on {update.timestamp ? format(new Date(update.timestamp), "PPp") : ''}</span></p>
                                            <p className="text-muted-foreground">{update.text}</p>
                                            {update.generatedSavings && (
                                                <p className="text-sm text-primary font-medium mt-1">
                                                    + {formatCurrency(update.generatedSavings)}
                                                </p>
                                            )}
                                            {attachment && (
                                                <a 
                                                    href={attachment.dataUrl} 
                                                    download={attachment.name}
                                                    className="flex items-center gap-2 mt-2 text-sm text-primary hover:underline"
                                                >
                                                    <Icons.file className="h-4 w-4" />
                                                    <span>{attachment.name}</span>
                                                </a>
                                            )}
                                            {reportingLocation && lead.location && (() => {
                                                const distance = getDistanceInKm(lead.location.lat, lead.location.lng, reportingLocation.lat, reportingLocation.lng);
                                                const isOnSite = distance < distanceThreshold;
                                                return (
                                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                                        <Icons.locateFixed className="h-4 w-4" />
                                                        <a 
                                                            href={`https://www.google.com/maps/search/?api=1&query=${reportingLocation.lat},${reportingLocation.lng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hover:underline"
                                                        >
                                                            Reported from location
                                                        </a>
                                                        <Badge variant={isOnSite ? 'default' : 'destructive'}>
                                                            {isOnSite ? "On-site" : "Off-site"} ({distance.toFixed(2)} km away)
                                                        </Badge>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    )})}
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
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isPendingApproval}>
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
                            <Button type="button" variant="outline" onClick={() => router.push('/')}>Cancel</Button>
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
