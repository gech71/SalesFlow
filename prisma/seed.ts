
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const districtsData = [
    { id: 'dist-1', name: 'Metro Area' },
    { id: 'dist-2', name: 'Suburban Area' },
];

const branchesData = [
  { id: 'branch-1', name: 'North Branch', districtId: 'dist-1' },
  { id: 'branch-2', name: 'South Branch', districtId: 'dist-1' },
  { id: 'branch-3', name: 'West Branch', districtId: 'dist-2' },
];

const officersData = [
  { id: 'officer-1', name: 'John Doe', branchId: 'branch-1' },
  { id: 'officer-2', name: 'Jane Smith', branchId: 'branch-1' },
  { id: 'officer-3', name: 'Peter Jones', branchId: 'branch-2' },
  { id: 'officer-4', name: 'Mary Williams', branchId: 'branch-2' },
  { id: 'officer-5', name: 'Sam Brown', branchId: 'branch-3' },
  { id: 'officer-6', name: 'Patricia Green', branchId: 'branch-3' },
];

const initialLeadsData = [
  {
    id: 'lead-1',
    title: 'New Client Inquiry - TechCorp',
    description: 'TechCorp is interested in our new software suite. Follow up required.',
    status: 'InProgress',
    districtId: 'dist-1',
    branchId: 'branch-1',
    officerId: 'officer-1',
    lat: 34.0522,
    lng: -118.2437,
    expectedSavings: 50000,
    createdAt: new Date(),
    deadline: new Date(new Date().setDate(new Date().getDate() + 7)),
    updates: [
        { text: 'Assigned to John Doe', timestamp: new Date(), author: 'Branch Manager' },
        { text: 'Initial meeting held. Client is very interested.', timestamp: new Date(), author: 'John Doe', generatedSavings: 25000 }
    ],
  },
  {
    id: 'lead-2',
    title: 'Partnership Opportunity - Innovate LLC',
    description: 'Potential partnership to integrate our platforms.',
    status: 'Assigned',
    districtId: 'dist-1',
    branchId: 'branch-2',
    officerId: null,
    lat: 40.7128,
    lng: -74.0060,
    expectedSavings: 120000,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
    deadline: new Date(new Date().setDate(new Date().getDate() + 14)),
    updates: [{ text: 'Initial contact made.', timestamp: new Date(), author: 'District Manager' }],
  },
  {
    id: 'lead-3',
    title: 'Renewal - Global Solutions',
    description: 'Contract renewal due next month. Need to discuss new terms.',
    status: 'New',
    districtId: 'dist-2',
    branchId: null,
    officerId: null,
    lat: 51.5074,
    lng: -0.1278,
    expectedSavings: 75000,
    createdAt: new Date(new Date().setDate(new Date().getDate() - 5)),
    deadline: new Date(new Date().setDate(new Date().getDate() + 10)),
    updates: [],
  },
];


const initialBranchPlansData = [
  {
    id: 'branch-1-Q3 2024',
    branchId: 'branch-1',
    quarter: 'Q3 2024',
    savingsTarget: 250000,
    entries: [
      { id: 'entry-1', date: new Date(new Date().setDate(new Date().getDate() - 15)), type: 'collection', amount: 75000, description: 'Initial deposit from campaign launch', status: 'Approved', submittedBy: 'Branch Manager', reviewedBy: 'District Director' },
      { id: 'entry-2', date: new Date(new Date().setDate(new Date().getDate() - 5)), type: 'collection', amount: 50000, description: 'Collected from TechCorp outreach', status: 'Pending', submittedBy: 'Branch Manager', reviewedBy: null, rejectionReason: null },
      { id: 'entry-3', date: new Date(new Date().setDate(new Date().getDate() - 2)), type: 'withdrawal', amount: 10000, description: 'Marketing event expenses', status: 'Pending', submittedBy: 'Branch Manager', reviewedBy: null, rejectionReason: null },
    ]
  },
  {
    id: 'branch-2-Q3 2024',
    branchId: 'branch-2',
    quarter: 'Q3 2024',
    savingsTarget: 300000,
    entries: [
      { id: 'entry-4', date: new Date(new Date().setDate(new Date().getDate() - 10)), type: 'collection', amount: 120000, description: 'Major client deposit', status: 'Approved', submittedBy: 'Branch Manager', reviewedBy: 'District Director', rejectionReason: null },
    ]
  },
  {
    id: 'branch-3-Q3 2024',
    branchId: 'branch-3',
    quarter: 'Q3 2024',
    savingsTarget: 180000,
    entries: []
  },
];


async function main() {
    console.log(`Start seeding ...`);

    // Seed Districts, Branches, Officers
    await Promise.all(districtsData.map(d => prisma.district.upsert({ where: { id: d.id }, update: {}, create: d })));
    console.log(`Seeded ${districtsData.length} districts`);
    
    await Promise.all(branchesData.map(b => prisma.branch.upsert({ where: { id: b.id }, update: {}, create: b })));
    console.log(`Seeded ${branchesData.length} branches`);
    
    await Promise.all(officersData.map(o => prisma.officer.upsert({ where: { id: o.id }, update: {}, create: o })));
    console.log(`Seeded ${officersData.length} officers`);

    // Seed Sales Leads and Updates
    for (const leadData of initialLeadsData) {
        const { updates, ...restOfLead } = leadData;
        await prisma.salesLead.upsert({
            where: { id: restOfLead.id },
            update: {
                ...restOfLead,
                officerId: restOfLead.officerId ?? undefined,
                branchId: restOfLead.branchId ?? undefined,
            },
            create: restOfLead,
        });
        if (updates && updates.length > 0) {
            await prisma.leadUpdate.deleteMany({ where: { salesLeadId: restOfLead.id }});
            await prisma.leadUpdate.createMany({
                data: updates.map(update => ({ ...update, salesLeadId: restOfLead.id }))
            });
        }
    }
    console.log(`Seeded ${initialLeadsData.length} sales leads and their updates.`);


    // Seed Branch Plans and Entries
    for (const planData of initialBranchPlansData) {
        const { entries, ...restOfPlan } = planData;
        await prisma.branchPlan.upsert({
            where: { id: restOfPlan.id },
            update: restOfPlan,
            create: restOfPlan,
        });

        if (entries && entries.length > 0) {
            await prisma.planEntry.deleteMany({ where: { branchPlanId: restOfPlan.id }});
            await prisma.planEntry.createMany({
                data: entries.map(entry => ({ 
                    id: entry.id,
                    date: entry.date,
                    type: entry.type,
                    amount: entry.amount,
                    description: entry.description,
                    status: entry.status,
                    submittedBy: entry.submittedBy,
                    reviewedBy: entry.reviewedBy,
                    rejectionReason: entry.rejectionReason,
                    branchPlanId: restOfPlan.id 
                }))
            });
        }
    }
    console.log(`Seeded ${initialBranchPlansData.length} branch plans and their entries.`);
    
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
