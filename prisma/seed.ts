
import { PrismaClient, LeadStatus, PlanEntryType, PlanEntryStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log(`Start seeding ...`);

    // Clear existing data in reverse order of dependencies
    await prisma.leadUpdate.deleteMany();
    await prisma.planEntry.deleteMany();
    await prisma.branchPlan.deleteMany();
    await prisma.salesLead.deleteMany();
    await prisma.officer.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.district.deleteMany();
    console.log('Cleared previous data.');

    // Seed Districts
    const dist1 = await prisma.district.create({ data: { name: 'Metro Area' } });
    const dist2 = await prisma.district.create({ data: { name: 'Suburban Area' } });
    console.log(`Seeded 2 districts`);

    // Seed Branches
    const branch1 = await prisma.branch.create({ data: { name: 'North Branch', districtId: dist1.id } });
    const branch2 = await prisma.branch.create({ data: { name: 'South Branch', districtId: dist1.id } });
    const branch3 = await prisma.branch.create({ data: { name: 'West Branch', districtId: dist2.id } });
    console.log(`Seeded 3 branches`);

    // Seed Officers
    const officer1 = await prisma.officer.create({ data: { name: 'John Doe', branchId: branch1.id } });
    const officer2 = await prisma.officer.create({ data: { name: 'Jane Smith', branchId: branch1.id } });
    const officer3 = await prisma.officer.create({ data: { name: 'Peter Jones', branchId: branch2.id } });
    const officer4 = await prisma.officer.create({ data: { name: 'Mary Williams', branchId: branch2.id } });
    const officer5 = await prisma.officer.create({ data: { name: 'Sam Brown', branchId: branch3.id } });
    const officer6 = await prisma.officer.create({ data: { name: 'Patricia Green', branchId: branch3.id } });
    console.log(`Seeded 6 officers`);

    // Seed Sales Leads
    const lead1 = await prisma.salesLead.create({
        data: {
            title: 'New Client Inquiry - TechCorp',
            description: 'TechCorp is interested in our new software suite. Follow up required.',
            status: LeadStatus.InProgress,
            districtId: dist1.id,
            branchId: branch1.id,
            officerId: officer1.id,
            lat: 34.0522,
            lng: -118.2437,
            expectedSavings: 50000,
            deadline: new Date(new Date().setDate(new Date().getDate() + 7)),
        },
    });

    // Seed LeadUpdates for lead1
    await prisma.leadUpdate.createMany({
        data: [
            { leadId: lead1.id, text: 'Assigned to John Doe', author: 'Branch Manager' },
            { leadId: lead1.id, text: 'Initial meeting held. Client is very interested.', author: 'John Doe', generatedSavings: 25000 }
        ]
    });

    const lead2 = await prisma.salesLead.create({
        data: {
            title: 'Partnership Opportunity - Innovate LLC',
            description: 'Potential partnership to integrate our platforms.',
            status: LeadStatus.Assigned,
            districtId: dist1.id,
            branchId: branch2.id,
            lat: 40.7128,
            lng: -74.0060,
            expectedSavings: 120000,
            createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
            deadline: new Date(new Date().setDate(new Date().getDate() + 14)),
        },
    });

    await prisma.leadUpdate.create({
        data: { leadId: lead2.id, text: 'Initial contact made.', author: 'District Manager' }
    });

    const lead3 = await prisma.salesLead.create({
        data: {
            title: 'Renewal - Global Solutions',
            description: 'Contract renewal due next month. Need to discuss new terms.',
            status: LeadStatus.New,
            districtId: dist2.id,
            lat: 51.5074,
            lng: -0.1278,
            expectedSavings: 75000,
            createdAt: new Date(new Date().setDate(new Date().getDate() - 5)),
            deadline: new Date(new Date().setDate(new Date().getDate() + 10)),
        },
    });
    console.log(`Seeded 3 sales leads and their updates.`);

    // Seed Branch Plans
    const plan1 = await prisma.branchPlan.create({
        data: {
            id: `${branch1.id}-Q3-2024`,
            branchId: branch1.id,
            quarter: 'Q3 2024',
            savingsTarget: 250000,
        }
    });

    // Seed PlanEntries for plan1
    await prisma.planEntry.createMany({
        data: [
            { branchPlanId: plan1.id, date: new Date(new Date().setDate(new Date().getDate() - 15)), type: PlanEntryType.collection, amount: 75000, description: 'Initial deposit from campaign launch', status: PlanEntryStatus.Approved, submittedBy: 'Branch Manager', reviewedBy: 'District Director' },
            { branchPlanId: plan1.id, date: new Date(new Date().setDate(new Date().getDate() - 5)), type: PlanEntryType.collection, amount: 50000, description: 'Collected from TechCorp outreach', status: PlanEntryStatus.Pending, submittedBy: 'Branch Manager' },
            { branchPlanId: plan1.id, date: new Date(new Date().setDate(new Date().getDate() - 2)), type: PlanEntryType.withdrawal, amount: 10000, description: 'Marketing event expenses', status: PlanEntryStatus.Pending, submittedBy: 'Branch Manager' },
        ]
    });

    const plan2 = await prisma.branchPlan.create({
        data: {
            id: `${branch2.id}-Q3-2024`,
            branchId: branch2.id,
            quarter: 'Q3 2024',
            savingsTarget: 300000,
        }
    });
    
    await prisma.planEntry.create({
        data: { branchPlanId: plan2.id, date: new Date(new Date().setDate(new Date().getDate() - 10)), type: PlanEntryType.collection, amount: 120000, description: 'Major client deposit', status: PlanEntryStatus.Approved, submittedBy: 'Branch Manager', reviewedBy: 'District Director' }
    });

    const plan3 = await prisma.branchPlan.create({
        data: {
            id: `${branch3.id}-Q3-2024`,
            branchId: branch3.id,
            quarter: 'Q3 2024',
            savingsTarget: 180000
        }
    });
    console.log(`Seeded 3 branch plans and their entries.`);

    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
