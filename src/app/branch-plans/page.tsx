
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import BranchPlansClient from './branch-plans-client';
import { quarters } from './data';
import { cookies } from 'next/headers';

export default async function BranchPlansPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;

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
        <BranchPlansClient user={serialize(user)} plans={serialize(plans)} branches={serialize(branches)} quarters={quarters} />
    );
}
