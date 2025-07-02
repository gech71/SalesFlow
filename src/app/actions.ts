
'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SalesLeadStatusEnum = z.enum([
  'New',
  'Assigned',
  'InProgress',
  'Reopened',
  'PendingClosure',
  'PendingDistrictApproval',
  'Closed',
]);

const PlanEntryTypeEnum = z.enum(['collection', 'withdrawal']);
const PlanEntryStatusEnum = z.enum(['Pending', 'Approved', 'Rejected']);

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
  revalidatePath('/assignments');
}

// Schema for adding a lead update
const updateSchema = z.object({
  leadId: z.string(),
  updateText: z.string().min(5),
  status: SalesLeadStatusEnum,
  generatedSavings: z.coerce.number().min(0).optional(),
  attachmentUrl: z.string().url().optional(),
  reportingLat: z.number().optional(),
  reportingLng: z.number().optional(),
  author: z.string(),
});

export async function addLeadUpdate(data: z.infer<typeof updateSchema>) {
  const validatedData = updateSchema.parse(data);
  const { leadId, status, updateText, author, generatedSavings, attachmentUrl, reportingLat, reportingLng } = validatedData;

  await prisma.salesLead.update({
    where: { id: leadId },
    data: {
      status: status,
      updates: {
        create: {
          text: updateText,
          author: author,
          generatedSavings: generatedSavings,
          attachmentUrl: attachmentUrl,
          reportingLat: reportingLat,
          reportingLng: reportingLng,
        },
      },
    },
  });

  revalidatePath(`/assignments/${leadId}`);
  revalidatePath('/assignments');
  revalidatePath('/dashboard');
}

// Action for a Branch Manager to assign a lead to a user
export async function assignUser(leadId: string, userId: string, note: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }});
  if (!user) throw new Error("User not found");

  await prisma.salesLead.update({
    where: { id: leadId },
    data: {
      assigneeId: userId,
      status: 'InProgress',
      updates: {
        create: [
          { text: `Assigned to officer ${user.name}.`, author: 'Branch Manager' },
          ...(note ? [{ text: `Note: ${note}`, author: 'Branch Manager' }] : []),
        ]
      },
    },
  });

  revalidatePath('/branch-assignments');
  revalidatePath('/assignments');
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
  revalidatePath('/assignments');
}

// Action for a District Manager to return a lead for rework (sends it back to officer)
export async function returnLeadForReworkDistrict(leadId: string, note: string) {
  await prisma.salesLead.update({
    where: { id: leadId },
    data: {
      status: 'Reopened',
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
  type: PlanEntryTypeEnum,
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
      date: new Date(),
      status: 'Pending',
      submittedBy: 'Branch Manager',
    },
  });
  revalidatePath('/submit-entry');
  revalidatePath('/branch-plans');
}

// Action to review a branch plan entry
export async function reviewPlanEntry(entryId: string, status: string, rejectionReason?: string) {
  const reviewStatus = PlanEntryStatusEnum.parse(status);

  if (reviewStatus === 'Rejected' && !rejectionReason) {
    throw new Error('Rejection reason is required when rejecting an entry.');
  }

  await prisma.planEntry.update({
    where: { id: entryId },
    data: {
      status: reviewStatus,
      rejectionReason: reviewStatus === 'Rejected' ? rejectionReason : null,
      reviewedBy: 'District Director',
    },
  });
  revalidatePath('/branch-plans');
  revalidatePath('/submit-entry');
  revalidatePath('/dashboard');
}

// Schema for updating a setting
const settingSchema = z.object({
  key: z.string(),
  value: z.string(),
});

// Action to update a setting
export async function updateSetting(data: z.infer<typeof settingSchema>) {
  const validatedData = settingSchema.parse(data);
  const { key, value } = validatedData;
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  revalidatePath('/settings');
  revalidatePath('/offsite-reports');
  revalidatePath('/assignments', 'layout'); // Revalidate all assignment detail pages
}


const loginSchema = z.object({
  phoneNumber: z.string().regex(/^(\+251|0)?[79]\d{8}$/, { message: "Please enter a valid Ethiopian phone number." }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

export async function loginAction(data: z.infer<typeof loginSchema>) {
    const validatedFields = loginSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, error: "Invalid phone number or password." };
    }

    const { phoneNumber, password } = validatedFields.data;

    try {
        const response = await fetch('http://localhost:5160/api/Auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber, password }),
        });

        if (!response.ok) {
            const errorResult = await response.json().catch(() => ({ errors: ['Invalid credentials or server error.'] }));
            return { success: false, error: errorResult.errors?.[0] || 'Invalid credentials' };
        }

        const result = await response.json();

        if (result.isSuccess && result.accessToken && result.refreshToken) {
            cookies().set('accessToken', result.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
            });
            cookies().set('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
            });
            
            // Store admin user ID if phone number matches
            if (phoneNumber.endsWith('912345678')) {
                cookies().set('userId', '91dff77e-f1f8-49f9-a9f6-482a9744f908', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    path: '/',
                });
            }

            return { success: true };
        } else {
            return { success: false, error: result.errors?.[0] || 'Login failed.' };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'An unexpected error occurred. Could not connect to the auth server.' };
    }
}


export async function logoutAction() {
    const accessToken = cookies().get('accessToken')?.value;
    const refreshToken = cookies().get('refreshToken')?.value;

    if (accessToken && refreshToken) {
        try {
            await fetch('http://localhost:5160/api/Auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: accessToken, refreshToken }),
            });
        } catch (error) {
            console.error('Failed to logout from auth server:', error);
        }
    }

    cookies().delete('accessToken');
    cookies().delete('refreshToken');
    cookies().delete('userId');
    redirect('/');
}
