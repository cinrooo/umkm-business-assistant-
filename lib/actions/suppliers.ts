"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { CreateSupplierSchema, UpdateSupplierSchema } from "@/lib/validations";
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

export async function getSuppliers(params?: { search?: string; page?: number; pageSize?: number }) {
  const membership = await requireMembership("supplier:read");
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
        { contactPerson: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [items, total] = await db.$transaction([
    db.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    db.supplier.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function createSupplier(formData: unknown): Promise<ActionResult<{ id: string }>> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("supplier:create");
  } catch {
    return { success: false, error: "Tidak memiliki izin membuat pemasok" };
  }

  const validated = CreateSupplierSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const session = await auth();

  const supplier = await db.$transaction(async (tx) => {
    const created = await tx.supplier.create({
      data: {
        organizationId: membership.organizationId,
        name: validated.data.name.trim(),
        contactPerson: validated.data.contactPerson?.trim() || null,
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
        action: "supplier.create",
        resourceType: "Supplier",
        resourceId: created.id,
        metadata: { name: created.name },
      },
    });

    return created;
  });

  return { success: true, data: { id: supplier.id } };
}

export async function updateSupplier(id: string, formData: unknown): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("supplier:update");
  } catch {
    return { success: false, error: "Tidak memiliki izin mengubah pemasok" };
  }

  const validated = UpdateSupplierSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const existing = await db.supplier.findFirst({
    where: { id, organizationId: membership.organizationId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Pemasok tidak ditemukan" };
  }

  const session = await auth();

  await db.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id },
      data: {
        ...(validated.data.name && { name: validated.data.name.trim() }),
        ...(validated.data.contactPerson !== undefined && { contactPerson: validated.data.contactPerson?.trim() || null }),
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
        action: "supplier.update",
        resourceType: "Supplier",
        resourceId: id,
        metadata: validated.data,
      },
    });
  });

  return { success: true, data: undefined };
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("supplier:delete");
  } catch {
    return { success: false, error: "Tidak memiliki izin menghapus pemasok" };
  }

  const existing = await db.supplier.findFirst({
    where: { id, organizationId: membership.organizationId, deletedAt: null },
  });

  if (!existing) {
    return { success: false, error: "Pemasok tidak ditemukan" };
  }

  const session = await auth();

  await db.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "supplier.delete",
        resourceType: "Supplier",
        resourceId: id,
        metadata: { name: existing.name },
      },
    });
  });

  return { success: true, data: undefined };
}
