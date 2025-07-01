
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import OfficerDashboardClient from './officer-dashboard-client';

export default async function OfficerDashboardPage() {

    const leads = await prisma.salesLead.findMany({
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
    
    return (
        <OfficerDashboardClient leads={serialize(leads)} />
    );
}
