
// In-memory database
// This is a simple in-memory database to replace Prisma for demonstration purposes.
// It allows the application to run without a real database connection.

export interface District {
    id: string;
    name: string;
}

export interface Branch {
    id: string;
    name: string;
    districtId: string;
}

export interface Officer {
    id: string;
    name: string;
    branchId: string;
}

export interface SalesLead {
    id: string;
    title: string;
    description: string;
    status: string; // New, Assigned, InProgress, PendingClosure, PendingDistrictApproval, Closed, Reopened
    districtId: string;
    branchId?: string | null;
    officerId?: string | null;
    lat: number;
    lng: number;
    expectedSavings: number;
    deadline: Date;
    createdAt: Date;
}

export interface LeadUpdate {
    id: string;
    salesLeadId: string;
    text: string;
    author: string;
    timestamp: Date;
    generatedSavings?: number | null;
    attachmentUrl?: string | null;
    reportingLat?: number | null;
    reportingLng?: number | null;
}

export interface Setting {
    key: string;
    value: string;
}

export interface BranchPlan {
    id: string;
    branchId: string;
    quarter: string;
    savingsTarget: number;
}

export interface PlanEntry {
    id: string;
    branchPlanId: string;
    date: Date;
    type: string; // 'collection' or 'withdrawal'
    amount: number;
    description: string;
    status: string; // 'Pending', 'Approved', 'Rejected'
    rejectionReason?: string | null;
    submittedBy: string;
    reviewedBy?: string | null;
}

let districts: District[] = [];
let branches: Branch[] = [];
let officers: Officer[] = [];
let salesLeads: SalesLead[] = [];
let leadUpdates: LeadUpdate[] = [];
let settings: Setting[] = [];
let branchPlans: BranchPlan[] = [];
let planEntries: PlanEntry[] = [];

const seedDatabase = () => {
    // Clear all data
    districts = [];
    branches = [];
    officers = [];
    salesLeads = [];
    leadUpdates = [];
    settings = [];
    branchPlans = [];
    planEntries = [];

    // Seed Settings
    settings.push({ key: 'offsiteDistanceThreshold', value: '1.0' });

    // Seed Districts
    const dist1: District = { id: 'dist1', name: 'Metro Area' };
    const dist2: District = { id: 'dist2', name: 'Suburban Area' };
    districts.push(dist1, dist2);

    // Seed Branches
    const branch1: Branch = { id: 'branch1', name: 'North Branch', districtId: dist1.id };
    const branch2: Branch = { id: 'branch2', name: 'South Branch', districtId: dist1.id };
    const branch3: Branch = { id: 'branch3', name: 'West Branch', districtId: dist2.id };
    branches.push(branch1, branch2, branch3);

    // Seed Officers
    const officer1: Officer = { id: 'officer1', name: 'John Doe', branchId: branch1.id };
    const officer2: Officer = { id: 'officer2', name: 'Jane Smith', branchId: branch1.id };
    const officer3: Officer = { id: 'officer3', name: 'Peter Jones', branchId: branch2.id };
    const officer4: Officer = { id: 'officer4', name: 'Mary Williams', branchId: branch2.id };
    const officer5: Officer = { id: 'officer5', name: 'Sam Brown', branchId: branch3.id };
    const officer6: Officer = { id: 'officer6', name: 'Patricia Green', branchId: branch3.id };
    officers.push(officer1, officer2, officer3, officer4, officer5, officer6);

    // Seed Sales Leads
    const lead1: SalesLead = {
        id: 'lead1',
        title: 'New Client Inquiry - TechCorp',
        description: 'TechCorp is interested in our new software suite. Follow up required.',
        status: 'InProgress',
        districtId: dist1.id,
        branchId: branch1.id,
        officerId: officer1.id,
        lat: 34.0522,
        lng: -118.2437,
        expectedSavings: 50000,
        deadline: new Date(new Date().setDate(new Date().getDate() + 7)),
        createdAt: new Date(),
    };
    salesLeads.push(lead1);

    leadUpdates.push(
        { id: `update-${Math.random()}`, salesLeadId: lead1.id, text: 'Assigned to John Doe', author: 'Branch Manager', timestamp: new Date() },
        { id: `update-${Math.random()}`, salesLeadId: lead1.id, text: 'Initial meeting held. Client is very interested.', author: 'John Doe', generatedSavings: 25000, timestamp: new Date() }
    );

    const lead2: SalesLead = {
        id: 'lead2',
        title: 'Partnership Opportunity - Innovate LLC',
        description: 'Potential partnership to integrate our platforms.',
        status: 'Assigned',
        districtId: dist1.id,
        branchId: branch2.id,
        officerId: officer3.id,
        lat: 40.7128,
        lng: -74.0060,
        expectedSavings: 120000,
        createdAt: new Date(new Date().setDate(new Date().getDate() - 2)),
        deadline: new Date(new Date().setDate(new Date().getDate() + 14)),
    };
    salesLeads.push(lead2);
    
    leadUpdates.push({ id: `update-${Math.random()}`, salesLeadId: lead2.id, text: 'Initial contact made.', author: 'District Manager', timestamp: new Date() });

    const lead3: SalesLead = {
        id: 'lead3',
        title: 'Renewal - Global Solutions',
        description: 'Contract renewal due next month. Need to discuss new terms.',
        status: 'New',
        districtId: dist2.id,
        branchId: null,
        officerId: null,
        lat: 51.5074,
        lng: -0.1278,
        expectedSavings: 75000,
        createdAt: new Date(new Date().setDate(new Date().getDate() - 5)),
        deadline: new Date(new Date().setDate(new Date().getDate() + 10)),
    };
    salesLeads.push(lead3);

    // Seed Branch Plans
    const plan1: BranchPlan = { id: `plan1`, branchId: branch1.id, quarter: 'Q3 2024', savingsTarget: 250000 };
    branchPlans.push(plan1);

    planEntries.push(
        { id: `entry-${Math.random()}`, branchPlanId: plan1.id, date: new Date(new Date().setDate(new Date().getDate() - 15)), type: 'collection', amount: 75000, description: 'Initial deposit from campaign launch', status: 'Approved', submittedBy: 'Branch Manager', reviewedBy: 'District Director' },
        { id: `entry-${Math.random()}`, branchPlanId: plan1.id, date: new Date(new Date().setDate(new Date().getDate() - 5)), type: 'collection', amount: 50000, description: 'Collected from TechCorp outreach', status: 'Pending', submittedBy: 'Branch Manager' },
        { id: `entry-${Math.random()}`, branchPlanId: plan1.id, date: new Date(new Date().setDate(new Date().getDate() - 2)), type: 'withdrawal', amount: 10000, description: 'Marketing event expenses', status: 'Pending', submittedBy: 'Branch Manager' }
    );
    
    const plan2: BranchPlan = { id: `plan2`, branchId: branch2.id, quarter: 'Q3 2024', savingsTarget: 300000 };
    branchPlans.push(plan2);
    
    planEntries.push({ id: `entry-${Math.random()}`, branchPlanId: plan2.id, date: new Date(new Date().setDate(new Date().getDate() - 10)), type: 'collection', amount: 120000, description: 'Major client deposit', status: 'Approved', submittedBy: 'Branch Manager', reviewedBy: 'District Director' });
    
    const plan3: BranchPlan = { id: `plan3`, branchId: branch3.id, quarter: 'Q3 2024', savingsTarget: 180000 };
    branchPlans.push(plan3);

};


// Initialize with seed data
seedDatabase();

// Helper to simulate Prisma's `include`
const includeRelations = (lead: SalesLead) => ({
    ...lead,
    district: districts.find(d => d.id === lead.districtId) || null,
    branch: branches.find(b => b.id === lead.branchId) || null,
    officer: officers.find(o => o.id === lead.officerId) || null,
    updates: leadUpdates.filter(u => u.salesLeadId === lead.id).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()),
});

const db = {
    salesLead: {
        findMany: async (query?: { where?: any, include?: any, orderBy?: any }) => {
            let results = salesLeads;
            if (query?.where) {
                results = results.filter(lead => {
                    return Object.entries(query.where).every(([key, value]) => {
                        if (key === 'OR') {
                            return value.some((orCondition: any) => 
                                Object.entries(orCondition).every(([orKey, orValue]: [string, any]) => lead[orKey as keyof SalesLead] === orValue)
                            );
                        }
                        if (key === 'officerId' && value?.not === null) {
                            return lead.officerId !== null;
                        }
                        return (lead as any)[key] === value;
                    });
                });
            }
             if (query?.orderBy) {
                const [key, direction] = Object.entries(query.orderBy)[0];
                results.sort((a, b) => {
                    const valA = (a as any)[key];
                    const valB = (b as any)[key];
                    if (valA < valB) return direction === 'asc' ? -1 : 1;
                    if (valA > valB) return direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            return results.map(includeRelations);
        },
        findUnique: async (query: { where: { id: string }, include?: any }) => {
            const lead = salesLeads.find(l => l.id === query.where.id);
            return lead ? includeRelations(lead) : null;
        },
        create: async (query: { data: Omit<SalesLead, 'id' | 'createdAt'> }) => {
            const newLead: SalesLead = {
                id: `lead-${Math.random()}`,
                ...query.data,
                createdAt: new Date(),
            };
            salesLeads.push(newLead);
            return newLead;
        },
        update: async (query: { where: { id: string }, data: Partial<SalesLead> & { updates?: { create: any } } }) => {
            const leadIndex = salesLeads.findIndex(l => l.id === query.where.id);
            if (leadIndex === -1) return null;

            const { updates, ...leadData } = query.data;
            salesLeads[leadIndex] = { ...salesLeads[leadIndex], ...leadData };
            
            if (updates?.create) {
                const newUpdates = Array.isArray(updates.create) ? updates.create : [updates.create];
                newUpdates.forEach(updateData => {
                    leadUpdates.push({
                        id: `update-${Math.random()}`,
                        salesLeadId: query.where.id,
                        timestamp: new Date(),
                        ...updateData,
                    });
                });
            }
            return salesLeads[leadIndex];
        }
    },
    district: {
        findMany: async () => districts,
        findUnique: async (query: {where: {id: string}}) => districts.find(d => d.id === query.where.id)
    },
    branch: {
        findMany: async (query?: { include?: any }) => {
            if (query?.include?.officers) {
                return branches.map(b => ({
                    ...b,
                    officers: officers.filter(o => o.branchId === b.id)
                }));
            }
            return branches;
        },
         findUnique: async (query: {where: {id: string}}) => branches.find(b => b.id === query.where.id)
    },
    officer: {
         findUnique: async (query: {where: {id: string}}) => officers.find(o => o.id === query.where.id)
    },
    setting: {
        findUnique: async (query: { where: { key: string } }) => settings.find(s => s.key === query.where.key) || null,
        upsert: async (query: { where: { key: string }, update: { value: string }, create: { key: string, value: string } }) => {
            const settingIndex = settings.findIndex(s => s.key === query.where.key);
            if (settingIndex !== -1) {
                settings[settingIndex].value = query.update.value;
                return settings[settingIndex];
            } else {
                const newSetting = { key: query.create.key, value: query.create.value };
                settings.push(newSetting);
                return newSetting;
            }
        }
    },
    branchPlan: {
        findMany: async (query?: { include?: any, distinct?: any[], orderBy?: any }) => {
            let results = branchPlans;

            if (query?.include?.branch) {
                results = results.map(p => ({
                    ...p,
                    branch: branches.find(b => b.id === p.branchId)!,
                }));
            }
            if (query?.include?.entries) {
                 results = results.map(p => ({
                    ...p,
                    entries: planEntries.filter(e => e.branchPlanId === p.id).sort((a,b) => b.date.getTime() - a.date.getTime()),
                }));
            }
             if (query?.orderBy) {
                const [key, direction] = Object.entries(query.orderBy)[0];
                results.sort((a, b) => {
                    const valA = (a as any)[key];
                    const valB = (b as any)[key];
                    if (valA < valB) return direction === 'asc' ? -1 : 1;
                    if (valA > valB) return direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }
             if (query?.distinct) {
                const distinctKey = query.distinct[0] as keyof BranchPlan;
                const seen = new Set();
                return results.filter(item => {
                    const value = item[distinctKey];
                    if (seen.has(value)) {
                        return false;
                    } else {
                        seen.add(value);
                        return true;
                    }
                }).map(item => ({ [distinctKey]: item[distinctKey] }));
            }
            return results;
        },
    },
    planEntry: {
        create: async (query: { data: Omit<PlanEntry, 'id'> }) => {
            const newEntry: PlanEntry = {
                id: `entry-${Math.random()}`,
                ...query.data,
            };
            planEntries.push(newEntry);
            return newEntry;
        },
        update: async (query: { where: { id: string }, data: Partial<PlanEntry> }) => {
            const entryIndex = planEntries.findIndex(e => e.id === query.where.id);
            if (entryIndex === -1) return null;
            planEntries[entryIndex] = { ...planEntries[entryIndex], ...query.data };
            return planEntries[entryIndex];
        }
    }
};

export default db;

