
import { serialize } from '@/lib/utils';
import db from '@/lib/db';
import DistrictAssignmentsClient from './district-assignments-client';

export default async function DistrictAssignmentsPage() {
    const leads = await db.salesLead.findMany({
        where: {
            OR: [
                { branchId: null },
                { status: 'PendingDistrictApproval' }
            ]
        },
        include: {
            district: true,
            branch: true,
            officer: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    const districts = await db.district.findMany({
        include: {
            branches: true
        }
    });

    return (
        <DistrictAssignmentsClient leads={serialize(leads)} districts={serialize(districts)} />
    );
}
