
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";
import { loginAction } from './actions';
import { ThemeToggle } from '@/components/theme-toggle';
import Image from 'next/image';

const loginSchema = z.object({
  phoneNumber: z.string().regex(/^(\+251|0)?[79]\d{8}$/, { message: "Please enter a valid Ethiopian phone number, e.g., 0912345678 or +251912345678." }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phoneNumber: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true);
    
    const result = await loginAction(data);
    
    if (result.success) {
        toast({
            title: 'Login Successful',
            description: 'Welcome back! Redirecting you to the dashboard...',
        });
        router.push('/dashboard');
    } else {
        toast({
            title: 'Login Failed',
            description: result.error,
            variant: 'destructive',
        });
        setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm z-10 bg-background/80 backdrop-blur-md border-border/50 shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex flex-col items-center justify-center gap-4 mb-4">
                <Image src="/nib tera sales.png" alt="NIB International Bank Logo" width={96} height={96} className="h-24 w-auto" />
            </div>
          <CardDescription>Welcome back! Please log in to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <div className="relative">
                  <Icons.phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Phone Number"
                    {...register('phoneNumber')}
                    disabled={isSubmitting}
                    className="pl-10"
                  />
              </div>
              {errors.phoneNumber && <p className="text-sm text-destructive">{errors.phoneNumber.message}</p>}
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Icons.lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  {...register('password')} 
                  disabled={isSubmitting}
                  className="pl-10 pr-10"
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
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
