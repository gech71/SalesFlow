
import { serialize } from '@/lib/utils';
import db from '@/lib/db';
import BranchAssignmentsClient from './branch-assignments-client';

export default async function BranchAssignmentsPage() {
    const leads = await db.salesLead.findMany({
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

    const branches = await db.branch.findMany({
        include: {
            officers: true
        }
    });

    return (
        <BranchAssignmentsClient leads={serialize(leads)} branches={serialize(branches)} />
    );
}
