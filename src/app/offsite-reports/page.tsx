
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import OffsiteReportsClient from './offsite-reports-client';
import { cookies } from 'next/headers';

const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return Infinity;
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

export default async function OffsiteReportsPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    }) : null;
    
    const permissions = user?.role?.permissions ?? [];

    const leadsWithOffsiteUpdates = await prisma.salesLead.findMany({
        where: {
            updates: {
                some: {
                    reportingLat: {
                        not: null
                    }
                }
            }
        },
        include: {
            assignee: true,
            updates: {
                where: {
                    reportingLat: {
                       not: null,
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                }
            }
        }
    });

    const thresholdSetting = await prisma.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' }
    });
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;

    const reports: { lead: any, update: any, distance: number }[] = [];
    leadsWithOffsiteUpdates.forEach(lead => {
        lead.updates.forEach(update => {
            if (lead.lat && lead.lng && update.reportingLat && update.reportingLng) {
                const distance = getDistanceInKm(
                    Number(lead.lat), 
                    Number(lead.lng), 
                    update.reportingLat, 
                    update.reportingLng
                );
                if (distance > threshold) {
                    reports.push({ lead, update, distance });
                }
            }
        });
    });

    reports.sort((a, b) => new Date(b.update.timestamp).getTime() - new Date(a.update.timestamp).getTime());

    return (
        <OffsiteReportsClient user={serialize(user)} permissions={permissions} reports={serialize(reports)} />
    );
}
