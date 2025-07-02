
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import AssignmentsClient from './assignments-client';
import { cookies } from 'next/headers';

export default async function AssignmentsPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

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
        <AssignmentsClient user={serialize(user)} leads={serialize(leads)} />
    );
}
