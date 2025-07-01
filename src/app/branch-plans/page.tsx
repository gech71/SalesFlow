
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import BranchPlansClient from './branch-plans-client';
import { quarters } from './data';

export default async function BranchPlansPage() {
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
        <BranchPlansClient plans={serialize(plans)} branches={serialize(branches)} quarters={quarters} />
    );
}
