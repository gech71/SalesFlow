
import type {Metadata, Viewport} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AuthRefresher from '@/components/auth-refresher';
import { ThemeProvider } from '@/components/theme-provider';
import { HoneycombBackground } from '@/components/honeycomb-background';
import { cn } from '@/lib/utils';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Sales Lead Management',
  description: 'Sales Lead Management for NIB International Bank',
  icons: {
    icon: '/nib tera sales.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#F3B000',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("antialiased font-sans", inter.variable)}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <HoneycombBackground />
            <AuthRefresher />
            {children}
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
