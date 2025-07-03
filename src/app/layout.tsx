
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AuthRefresher from '@/components/auth-refresher';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'Sales Lead Management',
  description: 'Sales Lead Management for NIB International Bank',
  manifest: '/manifest.json',
  icons: {
    icon: 'https://play-lh.googleusercontent.com/bXqMt9ROsGd0H9vPhib5hG-0NB-EJcAwZy6UUDhvlP-ykE595IMQtzr14R6IRWtJiGTh=w600-h300-pc0xffffff-pd',
    apple: 'https://play-lh.googleusercontent.com/bXqMt9ROsGd0H9vPhib5hG-0NB-EJcAwZy6UUDhvlP-ykE595IMQtzr14R6IRWtJiGTh=w180-h180-pc0xffffff-pd'
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
      <body className="antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <AuthRefresher />
            {children}
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
