
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import BranchAssignmentsClient from './branch-assignments-client';

export default async function BranchAssignmentsPage() {
    const leads = await prisma.salesLead.findMany({
        where: {
            OR: [
                { status: 'Assigned', officerId: null, branchId: { not: null } },
                { status: 'PendingClosure' }
            ]
        },
        include: {
            branch: {
                include: {
                    officers: true
                }
            },
            officer: true,
            updates: {
                orderBy: {
                    timestamp: 'desc'
                },
                take: 1
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    const branches = await prisma.branch.findMany({
        include: {
            officers: true
        }
    });

    return (
        <BranchAssignmentsClient leads={serialize(leads)} branches={serialize(branches)} />
    );
}
