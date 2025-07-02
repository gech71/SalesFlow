
import prisma from '@/lib/prisma';
import DashboardClient from './dashboard-client';
import { serialize } from '@/lib/utils';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('userId')?.value;
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    
    const leadsData = await prisma.salesLead.findMany({
        include: { updates: true },
    });
    const plansData = await prisma.branchPlan.findMany({
        include: { entries: true },
    });
    const districtsData = await prisma.district.findMany();
    const branchesData = await prisma.branch.findMany({
        include: { users: true }
    });

    return (
        <DashboardClient
            user={serialize(user)}
            leads={serialize(leadsData)}
            plans={serialize(plansData)}
            districts={serialize(districtsData)}
            branches={serialize(branchesData)}
        />
    );
}
