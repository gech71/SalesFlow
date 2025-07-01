
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import OfficerDashboardClient from './officer-dashboard-client';
import { SalesLead } from '@prisma/client';

export default async function OfficerDashboardPage() {

    const leadsData = await prisma.salesLead.findMany({
        where: { officerId: { not: null } },
        include: {
            district: true,
            branch: true,
            officer: true,
            updates: {
                orderBy: {
                    timestamp: 'desc'
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
    
    // The 'location' field is not directly on the SalesLead model, but constructed from lat/lng
    // and other relations are flattened. We need to map the data to the expected client type.
    const leads = leadsData.map(lead => ({
        ...lead,
        location: { lat: lead.lat, lng: lead.lng },
        districtName: lead.district?.name,
        branchName: lead.branch?.name,
        officerName: lead.officer?.name,
        // The updates relation is already fetched.
    }));

    return (
        <OfficerDashboardClient leads={serialize(leads)} />
    );
}
