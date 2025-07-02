
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log(`Start seeding ...`);

    // Clear existing data in reverse order of dependencies
    await prisma.leadUpdate.deleteMany();
    await prisma.planEntry.deleteMany();
    await prisma.branchPlan.deleteMany();
    await prisma.salesLead.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.district.deleteMany();
    await prisma.setting.deleteMany();
    console.log('Cleared previous data.');
    
    // Seed Settings
    await prisma.setting.create({
        data: { key: 'offsiteDistanceThreshold', value: '1' }
    });
    console.log(`Seeded 1 setting`);

    // Seed Roles
    const adminRole = await prisma.role.create({ data: { 
        name: 'ADMIN', 
        description: 'System Administrator', 
        permissions: [
            'dashboard:read', 'assignments:read_own', 'assignments:update_own', 
            'district_assignments:read', 'district_assignments:create_lead', 'district_assignments:assign_branch', 'district_assignments:approve',
            'branch_assignments:read', 'branch_assignments:assign_officer', 'branch_assignments:approve',
            'branch_plans:read', 'branch_plans:review', 'branch_plans:create_entry',
            'offsite_reports:read',
            'settings:manage_users', 'settings:manage_roles', 'settings:manage_reporting'
        ] 
    } });
    const districtManagerRole = await prisma.role.create({ data: { 
        name: 'DISTRICT_MANAGER', 
        description: 'Manages a district', 
        permissions: [
            'dashboard:read', 'district_assignments:read', 'district_assignments:create_lead', 'district_assignments:assign_branch', 'district_assignments:approve',
            'branch_plans:read', 'branch_plans:review', 'offsite_reports:read'
        ] 
    } });
    const branchManagerRole = await prisma.role.create({ data: { 
        name: 'BRANCH_MANAGER', 
        description: 'Manages a branch', 
        permissions: [
            'dashboard:read', 'branch_assignments:read', 'branch_assignments:assign_officer', 'branch_assignments:approve',
            'branch_plans:create_entry'
        ] 
    } });
    const officerRole = await prisma.role.create({ data: { 
        name: 'OFFICER', 
        description: 'Sales Officer', 
        permissions: ['dashboard:read', 'assignments:read_own', 'assignments:update_own'] 
    } });
    console.log('Seeded 4 roles');

    // Seed Districts
    const dist1 = await prisma.district.create({ data: { name: 'Metro Area' } });
    const dist2 = await prisma.district.create({ data: { name: 'Suburban Area' } });
    console.log(`Seeded 2 districts`);

    // Seed Branches
    const branch1 = await prisma.branch.create({ data: { name: 'North Branch', districtId: dist1.id } });
    const branch2 = await prisma.branch.create({ data: { name: 'South Branch', districtId: dist1.id } });
    const branch3 = await prisma.branch.create({ data: { name: 'West Branch', districtId: dist2.id } });
    console.log(`Seeded 3 branches`);

    // Seed Users
    // Admin User
    await prisma.user.create({
        data: {
            id: '91dff77e-f1f8-49f9-a9f6-482a9744f908',
            email: 'admin@example.com',
            firstName: 'Getaye',
            lastName: 'Temesgen',
            name: 'Getaye Temesgen',
            phoneNumber: '0912345678',
            roleId: adminRole.id,
        }
    });

    // District Managers
    const distManager1 = await prisma.user.create({
        data: { email: 'dm1@example.com', firstName: 'Diana', lastName: 'Prince', name: 'Diana Prince', roleId: districtManagerRole.id, districtId: dist1.id, phoneNumber: '0911111111' }
    });
    const distManager2 = await prisma.user.create({
        data: { email: 'dm2@example.com', firstName: 'Bruce', lastName: 'Wayne', name: 'Bruce Wayne', roleId: districtManagerRole.id, districtId: dist2.id, phoneNumber: '0922222222' }
    });

    // Branch Managers
    const branchManager1 = await prisma.user.create({
        data: { email: 'bm1@example.com', firstName: 'Clark', lastName: 'Kent', name: 'Clark Kent', roleId: branchManagerRole.id, branchId: branch1.id, districtId: dist1.id, phoneNumber: '0933333333' }
    });

    // Officers
    const officer1 = await prisma.user.create({ data: { email: 'johndoe@example.com', firstName: 'John', lastName: 'Doe', name: 'John Doe', branchId: branch1.id, districtId: dist1.id, roleId: officerRole.id, phoneNumber: '0944444441' } });
    const officer2 = await prisma.user.create({ data: { email: 'janesmith@example.com', firstName: 'Jane', lastName: 'Smith', name: 'Jane Smith', branchId: branch1.id, districtId: dist1.id, roleId: officerRole.id, phoneNumber: '0944444442' } });
    const officer3 = await prisma.user.create({ data: { email: 'peterjones@example.com', firstName: 'Peter', lastName: 'Jones', name: 'Peter Jones', branchId: branch2.id, districtId: dist1.id, roleId: officerRole.id, phoneNumber: '0944444443' } });
    const officer4 = await prisma.user.create({ data: { email: 'marywilliams@example.com', firstName: 'Mary', lastName: 'Williams', name: 'Mary Williams', branchId: branch2.id, districtId: dist1.id, roleId: officerRole.id, phoneNumber: '0944444444' } });
    const officer5 = await prisma.user.create({ data: { email: 'sambrown@example.com', firstName: 'Sam', lastName: 'Brown', name: 'Sam Brown', branchId: branch3.id, districtId: dist2.id, roleId: officerRole.id, phoneNumber: '0944444445' } });
    const officer6 = await prisma.user.create({ data: { email: 'patriciagreen@example.com', firstName: 'Patricia', lastName: 'Green', name: 'Patricia Green', branchId: branch3.id, districtId: dist2.id, roleId: officerRole.id, phoneNumber: '0944444446' } });
    console.log(`Seeded users`);

    // Seed Sales Leads
    const lead1 = await prisma.salesLead.create({
        data: {
            title: 'New Client Inquiry - TechCorp',
            description: 'TechCorp is interested in our new software suite. Follow up required.',
            status: 'InProgress',
            districtId: dist1.id,
            branchId: branch1.id,
            assigneeId: officer1.id,
            lat: 34.0522,
            lng: -118.2437,
            expectedSavings: 50000,
            deadline: new Date(new Date().setDate(new Date().getDate() + 7)),
        },
    });

    await prisma.leadUpdate.createMany({
        data: [
            { salesLeadId: lead1.id, text: `Assigned to ${officer1.name}`, author: 'Branch Manager' },
            { salesLeadId: lead1.id, text: 'Initial meeting held. Client is very interested.', author: officer1.name, generatedSavings: 25000 }
        ]
    });

    const lead2 = await prisma.salesLead.create({
        data: {
            title: 'Partnership Opportunity - Innovate LLC',
            description: 'Potential partnership to integrate our platforms.',
            status: 'Assigned',
            districtId: dist1.id,
            branchId: branch2.id,
            assigneeId: officer3.id,
            lat: 40.7128,
            lng: -74.0060,
            expectedSavings: 120000,
            createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
            deadline: new Date(new Date().setDate(new Date().getDate() + 14)),
        },
    });

     await prisma.leadUpdate.create({
        data: { salesLeadId: lead2.id, text: 'Initial contact made.', author: 'District Manager' }
    });


    const lead3 = await prisma.salesLead.create({
        data: {
            title: 'Renewal - Global Solutions',
            description: 'Contract renewal due next month. Need to discuss new terms.',
            status: 'New',
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
            branchId: branch1.id,
            quarter: 'Q3 2024',
            savingsTarget: 250000,
        }
    });

    await prisma.planEntry.createMany({
        data: [
            { branchPlanId: plan1.id, date: new Date(new Date().setDate(new Date().getDate() - 15)), type: 'collection', amount: 75000, description: 'Initial deposit from campaign launch', status: 'Approved', submittedBy: 'Branch Manager', reviewedBy: 'District Director' },
            { branchPlanId: plan1.id, date: new Date(new Date().setDate(new Date().getDate() - 5)), type: 'collection', amount: 50000, description: 'Collected from TechCorp outreach', status: 'Pending', submittedBy: 'Branch Manager' },
            { branchPlanId: plan1.id, date: new Date(new Date().setDate(new Date().getDate() - 2)), type: 'withdrawal', amount: 10000, description: 'Marketing event expenses', status: 'Pending', submittedBy: 'Branch Manager' },
        ]
    });

    const plan2 = await prisma.branchPlan.create({
        data: {
            branchId: branch2.id,
            quarter: 'Q3 2024',
            savingsTarget: 300000,
        }
    });

     await prisma.planEntry.create({
      data: { branchPlanId: plan2.id, date: new Date(new Date().setDate(new Date().getDate() - 10)), type: 'collection', amount: 120000, description: 'Major client deposit', status: 'Approved', submittedBy: 'Branch Manager', reviewedBy: 'District Director' }
    });
    
    await prisma.branchPlan.create({
        data: {
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
