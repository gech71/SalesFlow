
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AuthRefresher from '@/components/auth-refresher';
import { ThemeProvider } from '@/components/theme-provider';
import { HoneycombBackground } from '@/components/honeycomb-background';

export const metadata: Metadata = {
  title: 'Sales Lead Management',
  description: 'Sales Lead Management for NIB International Bank',
  icons: {
    icon: 'https://th.bing.com/th/id/R.f76dabe4fac17634185beac29762498b?rik=VcpX%2Bw6udP0tgA&riu=http%3a%2f%2fwww.ethioxchange.com%2fstorage%2fbanks%2flogo%2f01J73Y8N756BVZ9PPKF60ZYFM0.png&ehk=IB1kPIaDd2GDbC2Ur5HlQKTKS37a6%2bglIr8W58E5PzQ%3d&risl=&pid=ImgRaw&r=0',
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
            <HoneycombBackground />
            <AuthRefresher />
            {children}
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
