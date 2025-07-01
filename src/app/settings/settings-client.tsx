
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
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
import { Icons } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { updateSetting } from '@/app/actions';

const settingsSchema = z.object({
  threshold: z.coerce.number().min(0, { message: "Distance must be a positive number." }),
});

export default function SettingsClient({ threshold }: { threshold: number }) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      threshold: threshold
    }
  });

  useEffect(() => {
    reset({ threshold });
  }, [threshold, reset]);

  const onSubmit = async (data: z.infer<typeof settingsSchema>) => {
    try {
      await updateSetting({ key: 'offsiteDistanceThreshold', value: data.threshold.toString() });
      toast({
        title: "Settings Saved",
        description: "Your new settings have been applied.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings.",
        variant: "destructive",
      });
    }
  };

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
                    <Link href="/"><SidebarMenuButton><Icons.clipboardList className="mr-2" />My Assignments</SidebarMenuButton></Link>
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
                    <Link href="/settings"><SidebarMenuButton isActive><Icons.settings className="mr-2" />Settings</SidebarMenuButton></Link>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
          <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Settings</h1>
            </div>
            <div className="grid max-w-2xl gap-6">
              <Card>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Reporting Settings</CardTitle>
                        <CardDescription>
                            Manage settings related to lead reporting and validation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2">
                            <Label htmlFor="threshold">On-site Distance Threshold (km)</Label>
                            <Input
                                id="threshold"
                                type="number"
                                step="0.1"
                                {...register("threshold")}
                                disabled={isSubmitting}
                            />
                            <p className="text-sm text-muted-foreground">
                                Updates submitted further than this distance from the lead's location will be flagged as "Off-site".
                            </p>
                            {errors.threshold && <p className="text-red-500 text-xs mt-1">{errors.threshold.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                            Save Settings
                        </Button>
                    </CardFooter>
                </form>
              </Card>
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
