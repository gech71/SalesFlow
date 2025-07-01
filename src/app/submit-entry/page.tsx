
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import SubmitEntryClient from './submit-entry-client';

export default async function SubmitPlanEntryPage() {
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
        <SubmitEntryClient
            plans={serialize(plans)}
            branches={serialize(branches)}
            quarters={quarters}
        />
    );
}

