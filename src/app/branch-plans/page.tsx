
import { serialize } from '@/lib/utils';
import db from '@/lib/db';
import BranchPlansClient from './branch-plans-client';

export default async function BranchPlansPage() {
    const plans = await db.branchPlan.findMany({
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

    const branches = await db.branch.findMany();

    const allQuarters = await db.branchPlan.findMany({
        select: {
            quarter: true,
        },
        distinct: ['quarter'],
        orderBy: {
            quarter: 'desc',
        }
    });
    const quarters = allQuarters.map((q: any) => q.quarter);

    return (
        <BranchPlansClient plans={serialize(plans)} branches={serialize(branches)} quarters={quarters} />
    );
}
