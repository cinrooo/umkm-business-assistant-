"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { CreateCategorySchema, UpdateCategorySchema } from "@/lib/validations";
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

export async function getCategories() {
  const membership = await requireMembership("category:read");

  return db.category.findMany({
    where: {
      organizationId: membership.organizationId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          products: {
            where: { deletedAt: null },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(formData: unknown): Promise<ActionResult<{ id: string }>> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("category:create");
  } catch {
    return { success: false, error: "Tidak memiliki izin membuat kategori" };
  }

  const validated = CreateCategorySchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, description } = validated.data;

  // Cek apakah kategori sudah ada di organisasi ini
  const existing = await db.category.findFirst({
    where: {
      organizationId: membership.organizationId,
      name: { equals: name.trim(), mode: "insensitive" },
      deletedAt: null,
    },
  });

  if (existing) {
    return {
      success: false,
      error: "Kategori dengan nama ini sudah ada",
      fieldErrors: { name: ["Nama kategori sudah digunakan"] },
    };
  }

  const session = await auth();

  const category = await db.$transaction(async (tx) => {
    const created = await tx.category.create({
      data: {
        organizationId: membership.organizationId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "category.create",
        resourceType: "Category",
        resourceId: created.id,
        metadata: { name },
      },
    });

    return created;
  });

  return { success: true, data: { id: category.id } };
}

export async function updateCategory(
  id: string,
  formData: unknown
): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("category:update");
  } catch {
    return { success: false, error: "Tidak memiliki izin mengubah kategori" };
  }

  const validated = UpdateCategorySchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const category = await db.category.findFirst({
    where: {
      id,
      organizationId: membership.organizationId,
      deletedAt: null,
    },
  });

  if (!category) {
    return { success: false, error: "Kategori tidak ditemukan" };
  }

  if (validated.data.name && validated.data.name.trim() !== category.name) {
    const conflict = await db.category.findFirst({
      where: {
        organizationId: membership.organizationId,
        name: { equals: validated.data.name.trim(), mode: "insensitive" },
        id: { not: id },
        deletedAt: null,
      },
    });
    if (conflict) {
      return {
        success: false,
        error: "Kategori dengan nama ini sudah ada",
        fieldErrors: { name: ["Nama kategori sudah digunakan"] },
      };
    }
  }

  const session = await auth();

  await db.$transaction(async (tx) => {
    await tx.category.update({
      where: { id },
      data: {
        ...(validated.data.name && { name: validated.data.name.trim() }),
        ...(validated.data.description !== undefined && {
          description: validated.data.description?.trim() || null,
        }),
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "category.update",
        resourceType: "Category",
        resourceId: id,
        metadata: validated.data,
      },
    });
  });

  return { success: true, data: undefined };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("category:delete");
  } catch {
    return { success: false, error: "Tidak memiliki izin menghapus kategori" };
  }

  const category = await db.category.findFirst({
    where: {
      id,
      organizationId: membership.organizationId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: { products: { where: { deletedAt: null } } },
      },
    },
  });

  if (!category) {
    return { success: false, error: "Kategori tidak ditemukan" };
  }

  if (category._count.products > 0) {
    return {
      success: false,
      error: `Tidak dapat menghapus kategori yang masih memiliki ${category._count.products} produk`,
    };
  }

  const session = await auth();

  await db.$transaction(async (tx) => {
    await tx.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "category.delete",
        resourceType: "Category",
        resourceId: id,
        metadata: { name: category.name },
      },
    });
  });

  return { success: true, data: undefined };
}
