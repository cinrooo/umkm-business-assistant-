"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  CreateProductSchema,
  UpdateProductSchema,
  AdjustStockSchema,
} from "@/lib/validations";
import type { Permission } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

// ─── Shared auth helper ────────────────────────────────────────────────────────

type MembershipData = {
  id: string;
  organizationId: string;
  role: UserRole;
};

async function getActiveMembership(): Promise<MembershipData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    select: { id: true, organizationId: true, role: true },
  });
}

async function requireMembership(permission: Permission): Promise<MembershipData> {
  const membership = await getActiveMembership();
  if (!membership) throw new Error("Unauthorized");
  if (!hasPermission(membership.role, permission)) throw new Error("Forbidden");
  return membership;
}

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────

export async function getProducts(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  isActive?: boolean;
}) {
  const membership = await requireMembership("product:read");
  const { page = 1, pageSize = 20, search, categoryId, isActive } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    organizationId: membership.organizationId,
    deletedAt: null,
    ...(typeof isActive === "boolean" && { isActive }),
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { sku: { contains: search, mode: "insensitive" as const } },
        { barcode: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [items, total] = await db.$transaction([
    db.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    db.product.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getProductById(productId: string) {
  const membership = await requireMembership("product:read");

  const product = await db.product.findFirst({
    where: {
      id: productId,
      organizationId: membership.organizationId,
      deletedAt: null,
    },
    include: { category: true },
  });

  if (!product) throw new Error("Produk tidak ditemukan");
  return product;
}

export async function createProduct(
  formData: unknown
): Promise<ActionResult<{ productId: string }>> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("product:create");
  } catch {
    return { success: false, error: "Tidak memiliki izin untuk membuat produk" };
  }

  const validated = CreateProductSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { currentStock, ...productData } = validated.data;

  // Cek SKU unik dalam organisasi
  const existingSku = await db.product.findFirst({
    where: {
      organizationId: membership.organizationId,
      sku: validated.data.sku,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (existingSku) {
    return {
      success: false,
      error: "SKU sudah digunakan",
      fieldErrors: { sku: ["SKU ini sudah digunakan oleh produk lain"] },
    };
  }

  const session = await auth();

  const product = await db.$transaction(async (tx) => {
    const newProduct = await tx.product.create({
      data: {
        ...productData,
        organizationId: membership.organizationId,
        currentStock: currentStock ?? 0,
      },
      select: { id: true },
    });

    // Buat InventoryMovement untuk stok awal (jika > 0)
    if ((currentStock ?? 0) > 0) {
      await tx.inventoryMovement.create({
        data: {
          organizationId: membership.organizationId,
          productId: newProduct.id,
          type: "INITIAL",
          quantity: currentStock ?? 0,
          stockBefore: 0,
          stockAfter: currentStock ?? 0,
          reason: "Stok awal produk",
          performedById: session?.user?.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "product.create",
        resourceType: "Product",
        resourceId: newProduct.id,
        metadata: { name: productData.name, sku: productData.sku },
      },
    });

    return newProduct;
  });

  return { success: true, data: { productId: product.id } };
}

export async function updateProduct(
  productId: string,
  formData: unknown
): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("product:update");
  } catch {
    return { success: false, error: "Tidak memiliki izin untuk mengubah produk" };
  }

  // Verifikasi produk milik organisasi ini
  const existing = await db.product.findFirst({
    where: { id: productId, organizationId: membership.organizationId, deletedAt: null },
    select: { id: true, sku: true },
  });

  if (!existing) return { success: false, error: "Produk tidak ditemukan" };

  const validated = UpdateProductSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  // Cek SKU unik jika berubah
  if (validated.data.sku && validated.data.sku !== existing.sku) {
    const skuConflict = await db.product.findFirst({
      where: {
        organizationId: membership.organizationId,
        sku: validated.data.sku,
        id: { not: productId },
        deletedAt: null,
      },
      select: { id: true },
    });
    if (skuConflict) {
      return {
        success: false,
        error: "SKU sudah digunakan",
        fieldErrors: { sku: ["SKU ini sudah digunakan oleh produk lain"] },
      };
    }
  }

  const session = await auth();

  await db.$transaction([
    db.product.update({
      where: { id: productId },
      data: validated.data,
    }),
    db.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "product.update",
        resourceType: "Product",
        resourceId: productId,
        metadata: validated.data,
      },
    }),
  ]);

  return { success: true, data: undefined };
}

export async function deleteProduct(productId: string): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("product:delete");
  } catch {
    return { success: false, error: "Tidak memiliki izin untuk menghapus produk" };
  }

  const existing = await db.product.findFirst({
    where: { id: productId, organizationId: membership.organizationId, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!existing) return { success: false, error: "Produk tidak ditemukan" };

  const session = await auth();

  await db.$transaction([
    db.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    }),
    db.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        userId: session?.user?.id,
        action: "product.delete",
        resourceType: "Product",
        resourceId: productId,
        metadata: { name: existing.name },
      },
    }),
  ]);

  return { success: true, data: undefined };
}

// ─── STOCK ADJUSTMENT ─────────────────────────────────────────────────────────

export async function adjustStock(formData: unknown): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("inventory:adjust");
  } catch {
    return { success: false, error: "Tidak memiliki izin untuk menyesuaikan stok" };
  }

  const validated = AdjustStockSchema.safeParse(formData);
  if (!validated.success) {
    return {
      success: false,
      error: "Data tidak valid",
      fieldErrors: validated.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { productId, type, quantity, reason, notes } = validated.data;

  const session = await auth();

  await db.$transaction(async (tx) => {
    // Lock produk untuk update atomik
    const product = await tx.product.findFirst({
      where: {
        id: productId,
        organizationId: membership.organizationId,
        deletedAt: null,
      },
      select: { id: true, currentStock: true, minStock: true, name: true },
    });

    if (!product) throw new Error("Produk tidak ditemukan");

    // Tentukan arah perubahan stok
    // PURCHASE = masuk (positif), ADJUSTMENT bisa + atau -, LOSS = keluar (negatif)
    const direction = type === "PURCHASE" ? Math.abs(quantity) : quantity;
    const newStock = product.currentStock + direction;

    // Ambil pengaturan org untuk allow_negative_stock
    const org = await tx.organization.findUnique({
      where: { id: membership.organizationId },
      select: { allowNegativeStock: true },
    });

    if (!org?.allowNegativeStock && newStock < 0) {
      throw new Error(
        `Stok tidak mencukupi. Stok saat ini: ${product.currentStock}, pengurangan: ${Math.abs(direction)}`
      );
    }

    await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    await tx.inventoryMovement.create({
      data: {
        organizationId: membership.organizationId,
        productId,
        type,
        quantity: direction,
        stockBefore: product.currentStock,
        stockAfter: newStock,
        reason,
        notes,
        referenceType: "ADJUSTMENT",
        performedById: session?.user?.id,
      },
    });

    // Buat notifikasi low stock jika stok di bawah threshold
    const minStock = product.minStock;
    if (minStock !== null && newStock <= minStock && newStock >= 0) {
      await tx.notification.create({
        data: {
          organizationId: membership.organizationId,
          type: "LOW_STOCK",
          title: "Stok Menipis",
          message: `Stok ${product.name} tinggal ${newStock} ${newStock === 1 ? "unit" : "unit"} (batas minimum: ${minStock})`,
          metadata: { productId, currentStock: newStock, minStock },
        },
      });
    }
  });

  return { success: true, data: undefined };
}
