
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { serialize } from '@/lib/utils';
import NewLeadClient from './new-lead-client';

export default async function NewLeadPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({
        where: { id: userId },
        include: { role: true }
    }) : null;
    
    const permissions = user?.role?.permissions ?? [];

    return <NewLeadClient user={serialize(user)} permissions={permissions} />;
}
