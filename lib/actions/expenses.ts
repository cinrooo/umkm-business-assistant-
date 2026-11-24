"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { CreateExpenseSchema, CreateExpenseCategorySchema } from "@/lib/validations";
import type { UserRole } from "@prisma/client";
import type { Permission } from "@/lib/permissions";
import { Decimal } from "@prisma/client/runtime/library";

type MembershipData = {
  id: string;
  organizationId: string;
  role: UserRole;
};

async function requireMembership(permission: Permission): Promise<MembershipData> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    select: { id: true, organizationId: true, role: true },
  });

  if (!membership) throw new Error("Unauthorized");
  if (!hasPermission(membership.role, permission)) throw new Error("Forbidden");
  return membership;
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function getExpenses(params?: {
  categoryId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}) {
  const membership = await requireMembership("expense:read");
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = params?.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where = {
    organizationId: membership.organizationId,
    deletedAt: null,
    ...(params?.categoryId && { categoryId: params.categoryId }),
    ...(params?.from || params?.to
      ? {
          expenseDate: {
            ...(params.from && { gte: params.from }),
            ...(params.to && { lte: params.to }),
          },
        }
      : {}),
  };

  const [items, total, aggregate] = await db.$transaction([
    db.expense.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { expenseDate: "desc" },
      skip,
      take: pageSize,
    }),
    db.expense.count({ where }),
    db.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totalAmount: Number(aggregate._sum.amount ?? 0),
  };
}

export async function getExpenseCategories() {
  const membership = await requireMembership("expense:read");

  return db.expenseCategory.findMany({
    where: { organizationId: membership.organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createExpense(formData: unknown): Promise<ActionResult<{ id: string }>> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("expense:create");
  } catch {
    return { success: false, error: "Tidak memiliki izin mencatat pengeluaran" };
  }

  const validated = CreateExpenseSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const session = await auth();

  const expense = await db.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        organizationId: membership.organizationId,
        categoryId: validated.data.categoryId || null,
        amount: new Decimal(validated.data.amount),
        paymentMethod: validated.data.paymentMethod,
        description: validated.data.description.trim(),
        notes: validated.data.notes?.trim() || null,
        expenseDate: validated.data.expenseDate,
        createdById: session?.user?.id,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "expense.create",
        resourceType: "Expense",
        resourceId: created.id,
        metadata: {
          amount: validated.data.amount,
          description: validated.data.description,
        },
      },
    });

    return created;
  });

  return { success: true, data: { id: expense.id } };
}

export async function createExpenseCategory(formData: unknown): Promise<ActionResult<{ id: string }>> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("expense:create");
  } catch {
    return { success: false, error: "Tidak memiliki izin membuat kategori pengeluaran" };
  }

  const validated = CreateExpenseCategorySchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const existing = await db.expenseCategory.findFirst({
    where: {
      organizationId: membership.organizationId,
      name: { equals: validated.data.name.trim(), mode: "insensitive" },
    },
  });

  if (existing) {
    return {
      success: false,
      error: "Kategori pengeluaran ini sudah ada",
      fieldErrors: { name: ["Nama kategori sudah ada"] },
    };
  }

  const category = await db.expenseCategory.create({
    data: {
      organizationId: membership.organizationId,
      name: validated.data.name.trim(),
    },
  });

  return { success: true, data: { id: category.id } };
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("expense:delete");
  } catch {
    return { success: false, error: "Tidak memiliki izin menghapus pengeluaran" };
  }

  const existing = await db.expense.findFirst({
    where: { id, organizationId: membership.organizationId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Data pengeluaran tidak ditemukan" };
  }

  const session = await auth();

  await db.$transaction(async (tx) => {
    await tx.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "expense.delete",
        resourceType: "Expense",
        resourceId: id,
        metadata: { description: existing.description },
      },
    });
  });

  return { success: true, data: undefined };
}
