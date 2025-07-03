
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

// Helper to get current quarter string
function getCurrentQuarter(): string {
  const date = new Date();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  const year = date.getFullYear();
  return `Q${quarter} ${year}`;
}

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
  const lead = await prisma.salesLead.findUnique({ where: { id: leadId } });
  if (!lead) throw new Error("Sales lead not found");

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new Error("Branch not found");

  // Use a transaction to ensure both updates succeed or fail together
  await prisma.$transaction(async (tx) => {
    // 1. Update the sales lead
    await tx.salesLead.update({
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

    // 2. Update the branch plan's savings target if expectedSavings is set
    if (lead.expectedSavings && Number(lead.expectedSavings) > 0) {
      const currentQuarter = getCurrentQuarter();
      const existingPlan = await tx.branchPlan.findFirst({
        where: {
          branchId: branchId,
          quarter: currentQuarter,
        },
      });

      if (existingPlan) {
        // If a plan exists, increment its target
        await tx.branchPlan.update({
          where: { id: existingPlan.id },
          data: {
            savingsTarget: {
              increment: lead.expectedSavings,
            },
          },
        });
      } else {
        // If no plan exists, create a new one with the lead's expected savings as the initial target
        await tx.branchPlan.create({
          data: {
            branchId: branchId,
            quarter: currentQuarter,
            savingsTarget: lead.expectedSavings,
          },
        });
      }
    }
  });

  revalidatePath('/district-assignments');
  revalidatePath('/branch-assignments');
  revalidatePath('/dashboard');
  revalidatePath('/branch-plans');
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
        const baseUrl = process.env.AUTH_BASE_URL;
        const response = await fetch(`${baseUrl}/api/Auth/login`, {
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
            const user = await prisma.user.findUnique({
                where: { phoneNumber }
            });

            if (!user) {
                return { success: false, error: "Authenticated user not found in application database." };
            }

            const cookieStore = await cookies();
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7);

            const cookieOptions = {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict' as const,
                path: '/',
            };

            cookieStore.set('accessToken', result.accessToken, cookieOptions);
            cookieStore.set('refreshToken', result.refreshToken, cookieOptions);
            cookieStore.set('userId', user.id, cookieOptions);
            cookieStore.set('refreshTokenExpiry', expiryDate.toISOString(), {
                ...cookieOptions,
                httpOnly: false, // Client needs to read this
                expires: expiryDate,
            });

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
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (accessToken && refreshToken) {
        try {
            const baseUrl = process.env.AUTH_BASE_URL;
            await fetch(`${baseUrl}/api/Auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: accessToken, refreshToken }),
            });
        } catch (error) {
            console.error('Failed to logout from auth server:', error);
        }
    }

    cookieStore.delete('accessToken');
    cookieStore.delete('refreshToken');
    cookieStore.delete('userId');
    cookieStore.delete('refreshTokenExpiry');
    redirect('/');
}

export async function refreshTokenAction() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  if (!refreshToken) {
    return { success: false, error: 'No refresh token found.' };
  }

  try {
    const baseUrl = process.env.AUTH_BASE_URL;
    const response = await fetch(`${baseUrl}/api/Auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: accessToken, refreshToken }),
    });

    if (!response.ok) {
        console.error("Refresh token failed with status:", response.status)
        return { success: false, error: 'Failed to refresh token.' };
    }

    const result = await response.json();

    if (result.isSuccess && result.accessToken && result.refreshToken) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7);

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
      };
      
      cookieStore.set('accessToken', result.accessToken, cookieOptions);
      cookieStore.set('refreshToken', result.refreshToken, cookieOptions);
      cookieStore.set('refreshTokenExpiry', expiryDate.toISOString(), {
          ...cookieOptions,
          httpOnly: false,
          expires: expiryDate,
      });

      return { success: true };
    } else {
      return { success: false, error: result.errors?.[0] || 'Token refresh failed.' };
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false, error: 'An unexpected error occurred during token refresh.' };
  }
}

// User and Role Management Actions

const registerUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().regex(/^(\+251|0)?[79]\d{8}$/, 'Invalid Ethiopian phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleId: z.string().min(1, 'A role must be selected'),
});

export async function registerUser(data: z.infer<typeof registerUserSchema>) {
    const validatedData = registerUserSchema.safeParse(data);
    if (!validatedData.success) {
        return { success: false, error: "Invalid data provided." };
    }
    const { firstName, lastName, email, phoneNumber, password, roleId } = validatedData.data;

    const cookieStore = await cookies();
    const loggedInUserId = cookieStore.get('userId')?.value;

    if (!loggedInUserId) {
      return { success: false, error: "You must be logged in to perform this action." };
    }
    
    const loggedInUser = await prisma.user.findUnique({
      where: { id: loggedInUserId },
      include: { role: true },
    });
    
    if (!loggedInUser) {
      return { success: false, error: "Your user account could not be found." };
    }

    const targetRole = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!targetRole) {
      return { success: false, error: "The selected role does not exist." };
    }
    
    if (!loggedInUser.role.creatableRoles.includes(targetRole.name)) {
      return { success: false, error: `You do not have permission to create users with the role '${targetRole.name}'.` };
    }

    try {
        // First, call the external auth server to register the user.
        const baseUrl = process.env.AUTH_BASE_URL;
        const authResponse = await fetch(`${baseUrl}/api/Auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, phoneNumber, password }),
        });

        if (!authResponse.ok) {
            const errorResult = await authResponse.json().catch(() => ({ errors: ['Registration failed on auth server.'] }));
            return { success: false, error: errorResult.errors?.[0] || 'Auth server registration failed.' };
        }
        
        const authResult = await authResponse.json();

        if (authResult.isSuccess && authResult.accessToken) {
            const tokenParts = authResult.accessToken.split('.');
            if (tokenParts.length !== 3) {
                return { success: false, error: 'Invalid access token format from auth server.' };
            }

            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
            const userId = payload.sub;

            if (!userId) {
                return { success: false, error: 'Could not extract user ID from access token.' };
            }
            
            // After successful external registration, create the user in the local database with the ID from the token.
            await prisma.user.create({
                data: {
                    id: userId,
                    email,
                    name: `${firstName} ${lastName}`,
                    firstName,
                    lastName,
                    phoneNumber,
                    roleId
                }
            });

            revalidatePath('/settings');
            return { success: true };

        } else {
            return { success: false, error: authResult.errors?.[0] || 'Registration failed after auth server call.' };
        }

    } catch (error) {
        console.error('User registration error:', error);
        // This catch block will handle network errors or potential Prisma unique constraint violations,
        // which could indicate an inconsistency between the auth server and the local database.
        return { success: false, error: 'An unexpected error occurred. A user with these details might already exist locally.' };
    }
}

export async function updateUserRole(userId: string, roleId: string) {
    // When changing a role, we should clear the district/branch assignments
    // as they may no longer be relevant. The admin will need to re-assign.
    await prisma.user.update({
        where: { id: userId },
        data: { 
            roleId,
            districtId: null,
            branchId: null,
        },
    });
    revalidatePath('/settings');
}

export async function updateUserAssignment(userId: string, districtId?: string | null, branchId?: string | null) {
    await prisma.user.update({
        where: { id: userId },
        data: {
            districtId: districtId,
            branchId: branchId
        },
    });
    revalidatePath('/settings');
}


const roleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Role name is required'),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

export async function saveRole(data: z.infer<typeof roleSchema>) {
    const { id, ...roleData } = data;
    if (id) {
        await prisma.role.update({
            where: { id },
            data: {
                ...roleData,
                description: roleData.description || null,
            },
        });
    } else {
        await prisma.role.create({
            data: {
                ...roleData,
                description: roleData.description || null,
            },
        });
    }
    revalidatePath('/settings');
}

export async function deleteRole(roleId: string) {
    const usersWithRole = await prisma.user.count({
        where: { roleId },
    });

    if (usersWithRole > 0) {
        throw new Error('Cannot delete role as it is currently assigned to users.');
    }

    await prisma.role.delete({
        where: { id: roleId },
    });
    revalidatePath('/settings');
}


const creatableRolesSchema = z.record(z.string(), z.array(z.string()));

export async function updateCreatableRoles(data: z.infer<typeof creatableRolesSchema>) {
    const validatedData = creatableRolesSchema.parse(data);

    const updatePromises = Object.entries(validatedData).map(([roleId, creatableRoleNames]) => {
        return prisma.role.update({
            where: { id: roleId },
            data: {
                creatableRoles: {
                    set: creatableRoleNames,
                },
            },
        });
    });

    await prisma.$transaction(updatePromises);
    revalidatePath('/settings');
}
