
import prisma from '@/lib/prisma';
import DashboardClient from './dashboard-client';
import { serialize } from '@/lib/utils';

export default async function DashboardPage() {
    const leadsData = await prisma.salesLead.findMany({
        include: { updates: true },
    });
    const plansData = await prisma.branchPlan.findMany({
        include: { entries: true },
    });
    const districtsData = await prisma.district.findMany();
    const branchesData = await prisma.branch.findMany({
        include: { users: true }
    });

    return (
        <DashboardClient
            leads={serialize(leadsData)}
            plans={serialize(plansData)}
            districts={serialize(districtsData)}
            branches={serialize(branchesData)}
        />
    );
}
