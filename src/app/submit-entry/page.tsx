
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import SubmitEntryClient from './submit-entry-client';
import { quarters } from '../branch-plans/data';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function SubmitPlanEntryPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    }) : null;

    const permissions = user?.role?.permissions ?? [];
    if (!permissions.includes('branch_plans:create_entry')) {
        redirect('/forbidden');
    }

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
