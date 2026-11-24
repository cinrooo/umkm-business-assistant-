"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { CreateCustomerSchema, UpdateCustomerSchema } from "@/lib/validations";
import type { UserRole } from "@prisma/client";
import type { Permission } from "@/lib/permissions";

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

export async function getCustomers(params?: { search?: string; page?: number; pageSize?: number }) {
  const membership = await requireMembership("customer:read");
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = params?.pageSize ?? 20;
  const skip = (page - 1) * pageSize;
  const search = params?.search?.trim();

  const where = {
    organizationId: membership.organizationId,
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [items, total] = await db.$transaction([
    db.customer.findMany({
      where,
      include: {
        _count: {
          select: { sales: { where: { status: "COMPLETED" } } },
        },
        sales: {
          where: { status: "COMPLETED" },
          select: { total: true },
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    db.customer.count({ where }),
  ]);

  const formattedItems = items.map((c) => {
    const totalSpent = c.sales.reduce((acc, s) => acc + Number(s.total), 0);
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      notes: c.notes,
      totalOrders: c._count.sales,
      totalSpent,
      createdAt: c.createdAt,
    };
  });

  return {
    items: formattedItems,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCustomerById(id: string) {
  const membership = await requireMembership("customer:read");

  const customer = await db.customer.findFirst({
    where: {
      id,
      organizationId: membership.organizationId,
      deletedAt: null,
    },
    include: {
      sales: {
        where: { status: "COMPLETED" },
        orderBy: { soldAt: "desc" },
        take: 10,
        select: {
          id: true,
          transactionNo: true,
          soldAt: true,
          total: true,
          paymentMethod: true,
          paymentStatus: true,
        },
      },
    },
  });

  if (!customer) throw new Error("Pelanggan tidak ditemukan");
  return customer;
}

export async function createCustomer(formData: unknown): Promise<ActionResult<{ id: string }>> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("customer:create");
  } catch {
    return { success: false, error: "Tidak memiliki izin membuat pelanggan" };
  }

  const validated = CreateCustomerSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const session = await auth();

  const customer = await db.$transaction(async (tx) => {
    const created = await tx.customer.create({
      data: {
        organizationId: membership.organizationId,
        name: validated.data.name.trim(),
        phone: validated.data.phone?.trim() || null,
        email: validated.data.email?.trim() || null,
        address: validated.data.address?.trim() || null,
        notes: validated.data.notes?.trim() || null,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "customer.create",
        resourceType: "Customer",
        resourceId: created.id,
        metadata: { name: created.name },
      },
    });

    return created;
  });

  return { success: true, data: { id: customer.id } };
}

export async function updateCustomer(id: string, formData: unknown): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("customer:update");
  } catch {
    return { success: false, error: "Tidak memiliki izin mengubah pelanggan" };
  }

  const validated = UpdateCustomerSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const existing = await db.customer.findFirst({
    where: { id, organizationId: membership.organizationId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Pelanggan tidak ditemukan" };
  }

  const session = await auth();

  await db.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id },
      data: {
        ...(validated.data.name && { name: validated.data.name.trim() }),
        ...(validated.data.phone !== undefined && { phone: validated.data.phone?.trim() || null }),
        ...(validated.data.email !== undefined && { email: validated.data.email?.trim() || null }),
        ...(validated.data.address !== undefined && { address: validated.data.address?.trim() || null }),
        ...(validated.data.notes !== undefined && { notes: validated.data.notes?.trim() || null }),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "customer.update",
        resourceType: "Customer",
        resourceId: id,
        metadata: validated.data,
      },
    });
  });

  return { success: true, data: undefined };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("customer:delete");
  } catch {
    return { success: false, error: "Tidak memiliki izin menghapus pelanggan" };
  }

  const existing = await db.customer.findFirst({
    where: { id, organizationId: membership.organizationId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Pelanggan tidak ditemukan" };
  }

  const session = await auth();

  await db.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "customer.delete",
        resourceType: "Customer",
        resourceId: id,
        metadata: { name: existing.name },
      },
    });
  });

  return { success: true, data: undefined };
}
