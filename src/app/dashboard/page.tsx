
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
        include: { officers: true }
    });

    const transformedLeads = leadsData.map(lead => ({
        ...lead,
        location: { lat: lead.lat, lng: lead.lng },
    }));

    return (
        <DashboardClient
            leads={serialize(transformedLeads)}
            plans={serialize(plansData)}
            districts={serialize(districtsData)}
            branches={serialize(branchesData)}
        />
    );
}
