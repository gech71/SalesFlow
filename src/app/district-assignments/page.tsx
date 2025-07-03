
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import DistrictAssignmentsClient from './district-assignments-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DistrictAssignmentsPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;

    const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    }) : null;

    const permissions = user?.role?.permissions ?? [];
    if (!permissions.includes('district_assignments:read')) {
        redirect('/forbidden');
    }

    const leads = await prisma.salesLead.findMany({
        where: {
            OR: [
                { branchId: null },
                { status: 'PendingDistrictApproval' }
            ]
        },
        include: {
            district: true,
            branch: true,
            assignee: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    const districts = await prisma.district.findMany({
        include: {
            branches: true
        }
    });

    return (
        <DistrictAssignmentsClient 
            user={serialize(user)}
            leads={serialize(leads)} 
            districts={serialize(districts)}
            permissions={permissions} 
        />
    );
}
