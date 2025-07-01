
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { LeadStatus, PlanEntryStatus, PlanEntryType } from '@prisma/client';

// Schema for creating a new lead
const newLeadSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  districtId: z.string().min(1),
  expectedSavings: z.coerce.number().min(0),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  deadline: z.date(),
});

export async function createLead(formData: z.infer<typeof newLeadSchema>) {
  const validatedData = newLeadSchema.parse(formData);
  await prisma.salesLead.create({
    data: {
      ...validatedData,
      status: 'New',
    },
  });
  revalidatePath('/district-assignments');
  revalidatePath('/');
}

// Schema for adding a lead update
const updateSchema = z.object({
  leadId: z.string(),
  updateText: z.string().min(5),
  status: z.nativeEnum(LeadStatus),
  generatedSavings: z.coerce.number().min(0).optional(),
  attachment: z.any().optional(), // Cannot easily validate file data in server actions
  reportingLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
  author: z.string(),
});

export async function addLeadUpdate(data: z.infer<typeof updateSchema>) {
  const validatedData = updateSchema.parse(data);
  const { leadId, ...updateData } = validatedData;

  await prisma.salesLead.update({
    where: { id: leadId },
    data: {
      status: updateData.status,
      updates: {
        create: {
          text: updateData.updateText,
          author: updateData.author,
          generatedSavings: updateData.generatedSavings,
          reportingLocationJson: updateData.reportingLocation ? JSON.stringify(updateData.reportingLocation) : undefined,
          attachmentJson: updateData.attachment ? JSON.stringify(updateData.attachment) : undefined,
        },
      },
    },
  });

  revalidatePath(`/assignments/${leadId}`);
  revalidatePath('/');
  revalidatePath('/dashboard');
}

// Action for a Branch Manager to assign a lead to an officer
export async function assignOfficer(leadId: string, officerId: string, note: string) {
  const officer = await prisma.officer.findUnique({ where: { id: officerId }});
  if (!officer) throw new Error("Officer not found");

  await prisma.salesLead.update({
    where: { id: leadId },
    data: {
      officerId,
      status: 'InProgress',
      updates: {
        create: [
          { text: `Assigned to officer ${officer.name}.`, author: 'Branch Manager' },
          ...(note ? [{ text: `Note: ${note}`, author: 'Branch Manager' }] : []),
        ]
      },
    },
  });

  revalidatePath('/branch-assignments');
  revalidatePath('/');
}

// Action for a Branch Manager to approve a lead and send it to the district
export async function approveLeadBranch(leadId: string) {
  await prisma.salesLead.update({
    where: { id: leadId },
    data: {
      status: 'PendingDistrictApproval',
      updates: {
        create: {
          text: 'Approved by Branch Manager. Forwarded for final approval.',
          author: 'Branch Manager',
        },
      },
    },
  });
  revalidatePath('/branch-assignments');
  revalidatePath('/district-assignments');
}

// Action for a Branch Manager to return a lead to an officer for rework
export async function returnLeadForReworkBranch(leadId: string, note: string) {
  await prisma.salesLead.update({
    where: { id: leadId },
    data: {
      status: 'Reopened',
      updates: {
        create: {
          text: `Returned for rework: ${note}`,
          author: 'Branch Manager',
        },
      },
    },
  });
  revalidatePath('/branch-assignments');
  revalidatePath(`/assignments/${leadId}`);
}

// Action for a District Manager to assign a lead to a branch
export async function assignBranch(leadId: string, branchId: string) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }});
  if (!branch) throw new Error("Branch not found");

  await prisma.salesLead.update({
    where: { id: leadId },
    data: {
      branchId,
      status: 'Assigned',
      updates: {
        create: {
          text: `Assigned to ${branch.name}.`,
          author: 'District Manager',
        },
      },
    },
  });
  revalidatePath('/district-assignments');
  revalidatePath('/branch-assignments');
}

// Action for a District Manager to give final approval and close a lead
export async function approveLeadDistrict(leadId: string) {
  await prisma.salesLead.update({
    where: { id: leadId },
    data: {
      status: 'Closed',
      updates: {
        create: {
          text: 'Lead approved and closed by District Manager.',
          author: 'District Manager',
        },
      },
    },
  });
  revalidatePath('/district-assignments');
  revalidatePath('/');
}

// Action for a District Manager to return a lead for rework (sends it back to officer)
export async function returnLeadForReworkDistrict(leadId: string, note: string) {
  await prisma.salesLead.update({
    where: { id: leadId },
    data: {
      status: 'Reopened', // Or 'InProgress'
      updates: {
        create: {
          text: `Returned for rework: ${note}`,
          author: 'District Manager',
        },
      },
    },
  });
  revalidatePath('/district-assignments');
  revalidatePath(`/assignments/${leadId}`);
}

// Schema for a new plan entry
const newPlanEntrySchema = z.object({
  type: z.nativeEnum(PlanEntryType),
  amount: z.coerce.number().positive(),
  description: z.string().min(5),
});

// Action to create a new branch plan entry
export async function createPlanEntry(branchPlanId: string, data: z.infer<typeof newPlanEntrySchema>) {
  const validatedData = newPlanEntrySchema.parse(data);
  await prisma.planEntry.create({
    data: {
      branchPlanId,
      ...validatedData,
      status: 'Pending',
      submittedBy: 'Branch Manager',
    },
  });
  revalidatePath('/submit-entry');
  revalidatePath('/branch-plans');
}

// Action to review a branch plan entry
export async function reviewPlanEntry(entryId: string, status: PlanEntryStatus, rejectionReason?: string) {
  if (status === 'Rejected' && !rejectionReason) {
    throw new Error('Rejection reason is required when rejecting an entry.');
  }

  await prisma.planEntry.update({
    where: { id: entryId },
    data: {
      status,
      rejectionReason: status === 'Rejected' ? rejectionReason : null,
      reviewedBy: 'District Director',
    },
  });
  revalidatePath('/branch-plans');
  revalidatePath('/submit-entry');
  revalidatePath('/dashboard');
}
