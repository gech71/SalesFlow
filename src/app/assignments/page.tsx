
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import AssignmentsClient from './assignments-client';
import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';

export default async function AssignmentsPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    }) : null;

    if (!user) {
        // Middleware should prevent this, but as a safeguard:
        return <AssignmentsClient user={null} permissions={[]} leads={[]} />;
    }
    
    const permissions = user.role?.permissions ?? [];

    let where: Prisma.SalesLeadWhereInput = {};

    switch (user.role?.name) {
        case 'ADMIN':
            // Admin sees all assigned leads
            where = { assigneeId: { not: null } };
            break;
        case 'DISTRICT_MANAGER':
            // District Manager sees all assigned leads in their district
            if (user.districtId) {
                where = { districtId: user.districtId, assigneeId: { not: null } };
            } else {
                // If not assigned to a district, see no leads
                where = { id: 'no-match' };
            }
            break;
        case 'BRANCH_MANAGER':
            // Branch Manager sees all assigned leads in their branch
            if (user.branchId) {
                where = { branchId: user.branchId, assigneeId: { not: null } };
            } else {
                // If not assigned to a branch, see no leads
                where = { id: 'no-match' };
            }
            break;
        case 'OFFICER':
            // Officer sees only leads assigned to them
            where = { assigneeId: user.id };
            break;
        default:
            // Other roles see no assigned leads
            where = { id: 'no-match' };
            break;
    }


    const leads = await prisma.salesLead.findMany({
        where,
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
        <AssignmentsClient user={serialize(user)} permissions={permissions} leads={serialize(leads)} />
    );
}
