
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import BranchAssignmentsClient from './branch-assignments-client';
import { cookies } from 'next/headers';

export default async function BranchAssignmentsPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

    const leads = await prisma.salesLead.findMany({
        where: {
            OR: [
                { status: 'Assigned', assigneeId: null, branchId: { not: null } },
                { status: 'PendingClosure' }
            ]
        },
        include: {
            branch: true,
            assignee: {
                include: {
                    role: true
                }
            },
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
            users: {
                include: {
                    role: true
                }
            }
        }
    });

    return (
        <BranchAssignmentsClient user={serialize(user)} leads={serialize(leads)} branches={serialize(branches)} />
    );
}
