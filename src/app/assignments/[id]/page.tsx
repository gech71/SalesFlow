
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import AssignmentDetailClient from './assignment-detail-client';
import { serialize } from '@/lib/utils';
import { cookies } from 'next/headers';

export default async function AssignmentDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    }) : null;
    
    const permissions = user?.role?.permissions ?? [];
    if (!permissions.includes('assignments:read_own')) {
        redirect('/forbidden');
    }

    const lead = await prisma.salesLead.findUnique({
        where: { id },
        include: {
            updates: {
                orderBy: {
                    timestamp: 'desc'
                }
            },
            assignee: true,
        }
    });

    if (!lead) {
        notFound();
    }

    // Additional check: Ensure the user is actually allowed to see this specific lead
    const isOwner = lead.assigneeId === userId;
    const isAdmin = user?.role?.name === 'ADMIN';
    const isBranchManagerInSameBranch = user?.role?.name === 'BRANCH_MANAGER' && user?.branchId === lead.branchId;
    const isDistrictManagerInSameDistrict = user?.role?.name === 'DISTRICT_MANAGER' && user?.districtId === lead.districtId;

    if (!isOwner && !isAdmin && !isBranchManagerInSameBranch && !isDistrictManagerInSameDistrict) {
        redirect('/forbidden');
    }
    
    const thresholdSetting = await prisma.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' }
    });
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;
    
    return (
        <AssignmentDetailClient user={serialize(user)} permissions={permissions} lead={serialize(lead)} distanceThreshold={threshold} />
    );
}
