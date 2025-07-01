
import { serialize } from '@/lib/utils';
import db from '@/lib/db';
import OffsiteReportsClient from './offsite-reports-client';
import { SalesLead } from '@/lib/db';

export default async function OffsiteReportsPage() {
    const allLeads = await db.salesLead.findMany({ include: { officer: true, updates: true }}) as SalesLead[];
    
    const leadsWithOffsiteUpdates = allLeads.filter(lead => 
        lead.updates.some(update => update.reportingLat !== null && update.reportingLat !== undefined)
    );

    const thresholdSetting = await db.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' },
    });
    const offsiteDistanceThreshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;


    return (
        <OffsiteReportsClient leads={serialize(leadsWithOffsiteUpdates)} offsiteDistanceThreshold={offsiteDistanceThreshold} />
    );
}
