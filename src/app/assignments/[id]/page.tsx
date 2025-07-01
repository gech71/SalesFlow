
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import AssignmentDetailClient from './assignment-detail-client';
import { serialize } from '@/lib/utils';
import { Branch, Officer } from '@prisma/client';

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
    
    const leadWithLocation = {
        ...lead,
        location: { lat: lead.lat, lng: lead.lng }
    }

    return (
        <AssignmentDetailClient lead={serialize(leadWithLocation)} />
    );
}
