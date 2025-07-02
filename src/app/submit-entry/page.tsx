
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import SubmitEntryClient from './submit-entry-client';
import { quarters } from '../branch-plans/data';
import { cookies } from 'next/headers';

export default async function SubmitPlanEntryPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    }) : null;

    const permissions = user?.role?.permissions ?? [];

    const plans = await prisma.branchPlan.findMany({
        include: {
            branch: true,
            entries: {
                orderBy: {
                    date: 'desc'
                }
            }
        },
        orderBy: {
            quarter: 'desc'
        }
    });

    const branches = await prisma.branch.findMany();

    return (
        <SubmitEntryClient
            user={serialize(user)}
            permissions={permissions}
            plans={serialize(plans)}
            branches={serialize(branches)}
            quarters={quarters}
        />
    );
}
