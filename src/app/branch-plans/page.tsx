
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import BranchPlansClient from './branch-plans-client';

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

    const allQuarters = await prisma.branchPlan.findMany({
        select: {
            quarter: true,
        },
        distinct: ['quarter'],
        orderBy: {
            quarter: 'desc',
        }
    });
    const quarters = allQuarters.map(q => q.quarter);

    return (
        <BranchPlansClient plans={serialize(plans)} branches={serialize(branches)} quarters={quarters} />
    );
}

