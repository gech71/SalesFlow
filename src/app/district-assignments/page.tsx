
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import DistrictAssignmentsClient from './district-assignments-client';

export default async function DistrictAssignmentsPage() {
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
        <DistrictAssignmentsClient leads={serialize(leads)} districts={serialize(districts)} />
    );
}
