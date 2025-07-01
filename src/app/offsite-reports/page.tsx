
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import OffsiteReportsClient from './offsite-reports-client';

export default async function OffsiteReportsPage() {
    const leads = await prisma.salesLead.findMany({
        where: {
            updates: {
                some: {
                    reportingLocationJson: {
                        not: null
                    }
                }
            }
        },
        include: {
            officer: true,
            updates: {
                where: {
                    reportingLocationJson: {
                        not: null
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                }
            }
        }
    });
    
    // Construct the location object for each lead
    const leadsWithLocation = leads.map(lead => ({
        ...lead,
        location: { lat: lead.lat, lng: lead.lng }
    }));

    return (
        <OffsiteReportsClient leads={serialize(leadsWithLocation)} />
    );
}
