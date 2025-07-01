
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import SubmitEntryClient from './submit-entry-client';
import { quarters } from '../branch-plans/data';

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

    return (
        <SubmitEntryClient
            plans={serialize(plans)}
            branches={serialize(branches)}
            quarters={quarters}
        />
    );
}
