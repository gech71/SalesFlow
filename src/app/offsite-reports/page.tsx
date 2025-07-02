
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

    return (
        <OffsiteReportsClient user={serialize(user)} permissions={permissions} leads={serialize(leadsWithOffsiteUpdates)} distanceThreshold={threshold} />
    );
}
