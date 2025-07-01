
import { serialize } from '@/lib/utils';
import prisma from '@/lib/prisma';
import OffsiteReportsClient from './offsite-reports-client';

export default async function OffsiteReportsPage() {
    const leadsWithOffsiteUpdates = await prisma.salesLead.findMany({
        where: {
            updates: {
                some: {
                    reportingLat: {
                        not: null
                    }
                }
            }
        },
        include: {
            officer: true,
            updates: {
                where: {
                    reportingLat: {
                       not: null,
                    }
                },
                orderBy: {
                    timestamp: 'desc'
                }
            }
        }
    });

    const thresholdSetting = await prisma.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' }
    });
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;

    return (
        <OffsiteReportsClient leads={serialize(leadsWithOffsiteUpdates)} distanceThreshold={threshold} />
    );
}
