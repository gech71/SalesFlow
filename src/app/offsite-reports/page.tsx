
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import OffsiteReportsClient from './offsite-reports-client';
import { cookies } from 'next/headers';

export default async function OffsiteReportsPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    }) : null;
    
    const permissions = user?.role?.permissions ?? [];

    const updatesWithLocation = await prisma.leadUpdate.findMany({
        where: {
            reportingLat: { not: null },
            reportingLng: { not: null },
        },
        include: {
            lead: {
                include: {
                    assignee: true,
                }
            },
        },
        orderBy: {
            timestamp: 'desc'
        }
    });

    const thresholdSetting = await prisma.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' }
    });
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;

    return (
        <OffsiteReportsClient user={serialize(user)} permissions={permissions} updates={serialize(updatesWithLocation)} distanceThreshold={threshold} />
    );
}
