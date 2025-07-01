
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import OffsiteReportsClient from './offsite-reports-client';

export default async function OffsiteReportsPage() {
    const leads = await prisma.salesLead.findMany({
        where: {
            updates: {
                some: {
                    reportingLocation: {
                        not: null
                    }
                }
            }
        },
        include: {
            officer: true,
            updates: {
                where: {
                    reportingLocation: {
                        not: null
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                }
            }
        }
    });
    
    // Construct the location object
    const leadsWithLocation = leads.map(lead => ({
        ...lead,
        location: { lat: lead.lat, lng: lead.lng }
    }));

    return (
        <OffsiteReportsClient leads={serialize(leadsWithLocation)} />
    );
}
