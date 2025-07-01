
import { serialize } from '@/lib/utils';
import db from '@/lib/db';
import OfficerDashboardClient from './officer-dashboard-client';

export default async function OfficerDashboardPage() {

    const leads = await db.salesLead.findMany({
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
