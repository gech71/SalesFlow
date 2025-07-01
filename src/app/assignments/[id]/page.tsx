
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import AssignmentDetailClient from './assignment-detail-client';
import { serialize } from '@/lib/utils';

export default async function AssignmentDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const lead = await prisma.salesLead.findUnique({
        where: { id },
        include: {
            updates: {
                orderBy: {
                    timestamp: 'desc'
                }
            },
            officer: true,
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
        <AssignmentDetailClient lead={serialize(lead)} distanceThreshold={threshold} />
    );
}
