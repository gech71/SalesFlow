
import prisma from '@/lib/prisma';
import DashboardClient from './dashboard-client';
import type { SalesLead, BranchPlan, District, Branch } from '@prisma/client';
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

    // Transform raw Prisma data to match the structures expected by client components
    const transformedLeads = leadsData.map(lead => ({
      ...lead,
      // Create nested location object
      location: { lat: lead.lat, lng: lead.lng },
      updates: lead.updates.map(update => ({
        ...update,
        // Parse JSON fields
        attachment: update.attachmentJson ? JSON.parse(JSON.stringify(update.attachmentJson)) : undefined,
        reportingLocation: update.reportingLocationJson ? JSON.parse(JSON.stringify(update.reportingLocationJson)) : undefined,
      }))
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

    