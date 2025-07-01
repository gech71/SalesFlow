
import db from '@/lib/db';
import DashboardClient from './dashboard-client';
import { serialize } from '@/lib/utils';

export default async function DashboardPage() {
    const leadsData = await db.salesLead.findMany({
        include: { updates: true },
    });
    const plansData = await db.branchPlan.findMany({
        include: { entries: true },
    });
    const districtsData = await db.district.findMany();
    const branchesData = await db.branch.findMany({
        include: { officers: true }
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
