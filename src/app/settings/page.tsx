
import prisma from '@/lib/prisma';
import SettingsClient from './settings-client';
import { serialize } from '@/lib/utils';

export default async function SettingsPage() {
    const thresholdSetting = await prisma.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' }
    });
    
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;

    const users = await prisma.user.findMany({
        include: { role: true },
        orderBy: { createdAt: 'desc'}
    });
    
    const roles = await prisma.role.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <SettingsClient 
            threshold={threshold}
            users={serialize(users)}
            roles={serialize(roles)}
        />
    );
}
