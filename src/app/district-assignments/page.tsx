
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import DistrictAssignmentsClient from './district-assignments-client';
import { cookies } from 'next/headers';

export default async function DistrictAssignmentsPage() {
    const userId = cookies().get('userId')?.value;

    const user = userId ? await prisma.user.findUnique({
        where: { authId: userId },
        include: { role: true }
    }) : null;

    const permissions = user?.role?.permissions ?? [];

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
            leads={serialize(leads)} 
            districts={serialize(districts)}
            permissions={permissions} 
        />
    );
}
