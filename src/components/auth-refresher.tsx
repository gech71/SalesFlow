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
        const refreshTokenExpiry = Cookies.get('refreshTokenExpiry');
        
        // Only run on client-side and if expiry cookie exists
        if (typeof window !== 'undefined' && refreshTokenExpiry) {
            
            const handleRefresh = async () => {
                const expiryDate = new Date(refreshTokenExpiry);

                if (expiryDate < new Date()) {
                    console.log('Refresh token expired, logging out.');
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

            // Clear existing interval
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            // Set new interval
            intervalRef.current = setInterval(handleRefresh, REFRESH_INTERVAL);

        } else {
            // No expiry cookie, so ensure no interval is running
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        // Cleanup on component unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [pathname]); // Rerun when the route changes to check if the cookie exists

    return null; // This component doesn't render anything
}
