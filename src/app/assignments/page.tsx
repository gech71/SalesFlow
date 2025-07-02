
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import AssignmentsClient from './assignments-client';

export default async function AssignmentsPage() {

    const leads = await prisma.salesLead.findMany({
        where: { assigneeId: { not: null } },
        include: {
            district: true,
            branch: true,
            assignee: true,
            updates: {
                orderBy: {
                    timestamp: 'desc'
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
    
    return (
        <AssignmentsClient leads={serialize(leads)} />
    );
}
