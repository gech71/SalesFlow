
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { refreshTokenAction, logoutAction } from '@/app/actions';

const REFRESH_INTERVAL = 12 * 60 * 1000; // 12 minutes

export default function AuthRefresher() {
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        // Only run on client-side
        if (typeof window === 'undefined') return;

        const refreshToken = Cookies.get('refreshToken');
        const refreshTokenExpiry = Cookies.get('refreshTokenExpiry');
        
        // Only set up the interval if both tokens are present
        if (refreshToken && refreshTokenExpiry) {
            
            const handleRefresh = async () => {
                const expiryDate = new Date(refreshTokenExpiry);
                const currentRefreshToken = Cookies.get('refreshToken'); // Re-check before refresh

                if (expiryDate < new Date() || !currentRefreshToken) {
                    console.log('Refresh token expired or missing, logging out.');
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    await logoutAction(); // This will redirect
                    return;
                }

                const result = await refreshTokenAction();
                if (!result.success) {
                    console.error('Failed to refresh token, logging out:', result.error);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    await logoutAction(); // This will redirect
                }
            };

            // Clear any existing interval before setting a new one
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            intervalRef.current = setInterval(handleRefresh, REFRESH_INTERVAL);

        } else {
            // If tokens are not present, ensure no interval is running
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        // Cleanup function to clear interval on component unmount or route change
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [pathname]); // Rerun when the route changes to check cookies again

    return null; // This component doesn't render anything
}
