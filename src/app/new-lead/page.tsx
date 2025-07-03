
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { serialize } from '@/lib/utils';
import NewLeadClient from './new-lead-client';
import { redirect } from 'next/navigation';

export default async function NewLeadPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    }) : null;
    
    const permissions = user?.role?.permissions ?? [];
    if (!permissions.includes('district_assignments:create_lead')) {
        redirect('/forbidden');
    }

    return <NewLeadClient user={serialize(user)} permissions={permissions} />;
}
