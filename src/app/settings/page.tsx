
import prisma from '@/lib/prisma';
import SettingsClient from './settings-client';
import { serialize } from '@/lib/utils';
import { cookies } from 'next/headers';

export default async function SettingsPage() {
    const cookieStore = await cookies();
    const loggedInUserId = cookieStore.get('userId')?.value;
    const loggedInUser = loggedInUserId ? await prisma.user.findUnique({
        where: { id: loggedInUserId },
        include: { role: true }
    }) : null;

    const permissions = loggedInUser?.role?.permissions ?? [];

    const thresholdSetting = await prisma.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' }
    });
    
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;

    const users = await prisma.user.findMany({
        include: { 
            role: true,
            district: true,
            branch: true,
        },
        orderBy: { createdAt: 'desc'}
    });
    
    const roles = await prisma.role.findMany({
        orderBy: { name: 'asc' }
    });
    
    const districts = await prisma.district.findMany({
        include: {
            branches: true
        }
    });

    return (
        <SettingsClient 
            loggedInUser={serialize(loggedInUser)}
            permissions={permissions}
            threshold={threshold}
            users={serialize(users)}
            roles={serialize(roles)}
            districts={serialize(districts)}
        />
    );
}
