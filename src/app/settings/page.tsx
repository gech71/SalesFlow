
import prisma from '@/lib/prisma';
import SettingsClient from './settings-client';
import { serialize } from '@/lib/utils';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
    const cookieStore = await cookies();
    const loggedInUserId = cookieStore.get('userId')?.value;
    const loggedInUser = loggedInUserId ? await prisma.user.findUnique({
        where: { id: loggedInUserId },
        include: { role: true }
    }) : null;

    const permissions = loggedInUser?.role?.permissions ?? [];

    const canViewSettings = permissions.some(p => p.startsWith('settings:'));
    if (!canViewSettings) {
        redirect('/forbidden');
    }

    const thresholdSetting = await prisma.setting.findUnique({
        where: { key: 'offsiteDistanceThreshold' }
    });
    
    const threshold = thresholdSetting ? parseFloat(thresholdSetting.value) : 1.0;

    let users = await prisma.user.findMany({
        include: { 
            role: true,
            district: true,
            branch: true,
        },
        orderBy: { name: 'asc' }
    });

    // If the user is not an admin, filter the list of users they can see/edit.
    if (loggedInUser && loggedInUser.role.name !== 'ADMIN') {
        const creatableRoleNames = loggedInUser.role.creatableRoles || [];
        users = users.filter(user => 
            // A user can see themselves
            user.id === loggedInUser.id || 
            // A user can see others if they have permission to create that user's role
            (user.role?.name && creatableRoleNames.includes(user.role.name))
        );
    }
    
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
