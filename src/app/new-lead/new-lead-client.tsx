
'use client';

import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState, useEffect, useMemo } from 'react';
import { createLead } from '@/app/actions';
import { District, User, Role } from '@prisma/client';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import AppSidebar from '@/components/app-sidebar';

const leadSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters long.' }),
  districtId: z.string().min(1, { message: 'Please select a district.' }),
  expectedSavings: z.coerce.number().min(0, "Expected savings must be a positive number."),
  lat: z.coerce.number({ invalid_type_error: "Please search for and select a location." }).min(-90, "Invalid latitude").max(90, "Invalid latitude"),
  lng: z.coerce.number().min(-180, "Invalid longitude").max(180, "Invalid longitude"),
  deadline: z.date({ required_error: 'A deadline date is required.' }),
});

type ClientUser = User & { role: Role | null };

export default function NewLeadClient({ user, permissions }: { user: ClientUser | null, permissions: string[] }) {
  const { toast } = useToast();
  const router = useRouter();

  const [districts, setDistricts] = useState<District[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  useEffect(() => {
    // Fetch districts for the select dropdown
    const fetchDistricts = async () => {
        const res = await fetch('/api/districts');
        const data = await res.json();
        setDistricts(data);
    };
    fetchDistricts();
  }, []);

  const methods = useForm<z.infer<typeof leadSchema>>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
        title: '',
        description: '',
        districtId: '',
        expectedSavings: 0,
        deadline: new Date(new Date().setDate(new Date().getDate() + 7)),
    }
  });

  const { control, handleSubmit, formState: { errors } } = methods;

  useEffect(() => {
    if (searchQuery.length < 3 || searchQuery === selectedLocationName) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      if(selectedLocationName) setSelectedLocationName('');
      methods.setValue('lat', undefined as any, { shouldValidate: true });
      methods.setValue('lng', undefined as any);

      try {
        const response = await fetch(`/api/location-search?q=${encodeURIComponent(searchQuery)}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Failed to fetch location data:", error);
        toast({
          title: "Location Search Failed",
          description: "Could not retrieve location data. Please check your connection and try again.",
          variant: "destructive",
        })
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedLocationName, methods, toast]);

  const handleSelectLocation = (location: any) => {
    methods.setValue('lat', parseFloat(location.lat), { shouldValidate: true });
    methods.setValue('lng', parseFloat(location.lon));
    setSelectedLocationName(location.display_name);
    setSearchResults([]);
    setSearchQuery(location.display_name);
  };

  const onSubmit = async (data: z.infer<typeof leadSchema>) => {
    try {
        await createLead(data);
        toast({
            title: "Lead Created",
            description: `New lead "${data.title}" has been successfully created.`,
        });
        router.push('/district-assignments');
    } catch (error) {
        console.error("Failed to create lead: ", error);
        toast({
            title: "Error",
            description: "Failed to create the lead. Please try again.",
            variant: "destructive"
        });
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} permissions={permissions} />
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col">
          <header className="sticky top-0 z-10 flex flex-col gap-4 border-b bg-background/95 p-4 backdrop-blur-sm md:px-6">
            <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="flex-1 text-xl font-semibold tracking-tight">Create New Sales Lead</h1>
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
                            <Link href="/district-assignments">District View</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Create New Lead</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <Card>
                <FormProvider {...methods}>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Lead Details</CardTitle>
                        <CardDescription>
                            Fill in the details to create a new task. It can be assigned later.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" {...methods.register('title')} />
                            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" {...methods.register('description')} />
                            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="districtId">District</Label>
                                <Controller
                                    control={control}
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
                                {errors.districtId && <p className="text-red-500 text-xs mt-1">{errors.districtId.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="expectedSavings">Savings Target</Label>
                                <Input id="expectedSavings" type="number" {...methods.register('expectedSavings')} />
                                {errors.expectedSavings && <p className="text-red-500 text-xs mt-1">{errors.expectedSavings.message}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label>Deadline</Label>
                                <Controller
                                    control={control}
                                    name="deadline"
                                    render={({ field }) => (
                                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <Icons.calendar className="mr-2 h-4 w-4" />
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={(date) => {
                                                        if (date) field.onChange(date);
                                                        setIsCalendarOpen(false);
                                                    }}
                                                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                />
                                {errors.deadline && <p className="text-red-500 text-xs mt-1">{errors.deadline.message}</p>}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="location-search">Location</Label>
                            <div className="relative">
                                <Input
                                    id="location-search"
                                    placeholder="Start typing an address to search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoComplete="off"
                                />
                                {isSearching && <Icons.spinner className="animate-spin absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                            </div>
                             {errors.lat && !selectedLocationName && <p className="text-red-500 text-xs mt-1">{errors.lat.message}</p>}
                            {searchResults.length > 0 && (
                                <Card className="mt-2">
                                    <CardContent className="p-2 max-h-48 overflow-y-auto">
                                        <ul className="space-y-1">
                                            {searchResults.map((result) => (
                                                <li key={result.place_id}>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        className="w-full h-auto text-left justify-start py-2 px-2 truncate"
                                                        onClick={() => handleSelectLocation(result)}
                                                    >
                                                        {result.display_name}
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            )}
                            {selectedLocationName && !searchResults.length && (
                                <div className="mt-2 text-sm text-muted-foreground p-3 border rounded-md bg-muted/50">
                                    <p className="font-medium text-foreground">Selected Location:</p>
                                    <p className="break-words">{selectedLocationName}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button type="submit">Create Lead</Button>
                    </CardFooter>
                </form>
                </FormProvider>
            </Card>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
