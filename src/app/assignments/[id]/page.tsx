
import db from '@/lib/db';
import { notFound } from 'next/navigation';
import AssignmentDetailClient from './assignment-detail-client';
import { serialize } from '@/lib/utils';
import { SalesLead, LeadUpdate, Officer } from '@/lib/db';

type EnrichedSalesLead = SalesLead & {
    updates: LeadUpdate[];
    officer: Officer | null;
};


export default async function AssignmentDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const lead = await db.salesLead.findUnique({
        where: { id },
        include: {
            updates: true,
            officer: true,
        }
    }) as EnrichedSalesLead | null;

    if (!lead) {
        notFound();
    }
    
    const thresholdSetting = await db.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' },
    });
    const offsiteDistanceThreshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;

    return (
        <AssignmentDetailClient lead={serialize(lead)} offsiteDistanceThreshold={offsiteDistanceThreshold} />
    );
}
