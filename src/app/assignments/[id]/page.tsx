
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import AssignmentDetailClient from './assignment-detail-client';
import { serialize } from '@/lib/utils';
import { cookies } from 'next/headers';

export default async function AssignmentDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    }) : null;
    
    const permissions = user?.role?.permissions ?? [];

    const lead = await prisma.salesLead.findUnique({
        where: { id },
        include: {
            updates: {
                orderBy: {
                    timestamp: 'desc'
                }
            },
            assignee: true,
        }
    });

    if (!lead) {
        notFound();
    }
    
    const thresholdSetting = await prisma.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' }
    });
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;
    
    return (
        <AssignmentDetailClient user={serialize(user)} permissions={permissions} lead={serialize(lead)} distanceThreshold={threshold} />
    );
}
