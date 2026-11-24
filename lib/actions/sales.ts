"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { CreateSaleSchema, CancelSaleSchema } from "@/lib/validations";
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
  | { success: false; error: string };

// Generate nomor transaksi unik: TRX-YYYYMMDD-SEQUENCE
async function generateTransactionNo(
  organizationId: string,
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]
): Promise<string> {
  const today = new Date();
  const dateStr = today
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const prefix = `TRX-${dateStr}-`;

  // Hitung berapa transaksi sudah ada hari ini
  const count = await tx.sale.count({
    where: {
      organizationId,
      transactionNo: { startsWith: prefix },
    },
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `${prefix}${sequence}`;
}

// ─── CREATE SALE ───────────────────────────────────────────────────────────────

export async function createSale(
  formData: unknown
): Promise<ActionResult<{ saleId: string; transactionNo: string }>> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("sale:create");
  } catch {
    return { success: false, error: "Tidak memiliki izin untuk membuat transaksi" };
  }

  const validated = CreateSaleSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0]?.message ?? "Data tidak valid" };
  }

  const data = validated.data;
  const session = await auth();

  try {
    const sale = await db.$transaction(async (tx) => {
      // Cek idempotency - cegah double submission
      const existing = await tx.sale.findFirst({
        where: { idempotencyKey: data.idempotencyKey },
        select: { id: true, transactionNo: true },
      });
      if (existing) return existing;

      // Ambil pengaturan org (pajak, stok negatif)
      const org = await tx.organization.findUnique({
        where: { id: membership.organizationId },
        select: { taxRate: true, allowNegativeStock: true },
      });
      if (!org) throw new Error("Organisasi tidak ditemukan");

      // Validasi semua produk dan stok dalam satu batch
      const productIds = data.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          organizationId: membership.organizationId,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          sku: true,
          costPrice: true,
          sellingPrice: true,
          currentStock: true,
          minStock: true,
        },
      });

      // Pastikan semua produk ditemukan
      if (products.length !== productIds.length) {
        const foundIds = new Set(products.map((p) => p.id));
        const missing = productIds.filter((id) => !foundIds.has(id));
        throw new Error(`Produk tidak ditemukan: ${missing.join(", ")}`);
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      // Hitung subtotal per item dan validasi stok
      let subtotal = 0;
      const itemsWithCalc = data.items.map((item) => {
        const product = productMap.get(item.productId)!;

        if (!org.allowNegativeStock && product.currentStock < item.quantity) {
          throw new Error(
            `Stok ${product.name} tidak mencukupi. Tersedia: ${product.currentStock}, diminta: ${item.quantity}`
          );
        }

        const unitPrice = Number(product.sellingPrice);
        const itemSubtotal = Math.max(0, (unitPrice - item.discountAmount) * item.quantity);
        subtotal += itemSubtotal;

        return { item, product, unitPrice, itemSubtotal };
      });

      // Hitung total transaksi
      const afterDiscount = Math.max(0, subtotal - data.discountAmount);
      const taxRate = Number(org.taxRate);
      const taxAmount = Math.round((afterDiscount * taxRate) / 100);
      const total = afterDiscount + taxAmount;

      const transactionNo = await generateTransactionNo(membership.organizationId, tx);

      // Buat Sale
      const newSale = await tx.sale.create({
        data: {
          organizationId: membership.organizationId,
          transactionNo,
          customerId: data.customerId || null,
          status: "COMPLETED",
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentStatus,
          subtotal: new Decimal(subtotal),
          discountAmount: new Decimal(data.discountAmount),
          taxAmount: new Decimal(taxAmount),
          total: new Decimal(total),
          notes: data.notes,
          idempotencyKey: data.idempotencyKey,
          soldById: session?.user?.id,
        },
        select: { id: true, transactionNo: true },
      });

      // Buat SaleItems, kurangi stok, dan buat InventoryMovement
      for (const { item, product, unitPrice, itemSubtotal } of itemsWithCalc) {
        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: product.id,
            productName: product.name,         // snapshot
            productSku: product.sku,           // snapshot
            costPriceSnapshot: product.costPrice, // snapshot
            unitPriceSnapshot: new Decimal(unitPrice), // snapshot
            quantity: item.quantity,
            discountAmount: new Decimal(item.discountAmount),
            subtotal: new Decimal(itemSubtotal),
          },
        });

        const newStock = product.currentStock - item.quantity;

        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: newStock },
        });

        await tx.inventoryMovement.create({
          data: {
            organizationId: membership.organizationId,
            productId: product.id,
            type: "SALE",
            quantity: -item.quantity,
            stockBefore: product.currentStock,
            stockAfter: newStock,
            reason: `Penjualan ${transactionNo}`,
            referenceId: newSale.id,
            referenceType: "SALE",
            performedById: session?.user?.id,
          },
        });

        // Notifikasi low stock
        const minStock = product.minStock;
        if (minStock !== null && newStock <= minStock && newStock >= 0) {
          await tx.notification.upsert({
            where: {
              // Gunakan kombinasi unik untuk cegah duplikat notifikasi low stock
              id: `lowstock-${product.id}-${new Date().toISOString().slice(0, 10)}`,
            },
            create: {
              id: `lowstock-${product.id}-${new Date().toISOString().slice(0, 10)}`,
              organizationId: membership.organizationId,
              type: "LOW_STOCK",
              title: "Stok Menipis",
              message: `Stok ${product.name} tinggal ${newStock} unit (minimum: ${minStock})`,
              metadata: { productId: product.id, currentStock: newStock, minStock },
            },
            update: {
              isRead: false,
              message: `Stok ${product.name} tinggal ${newStock} unit (minimum: ${minStock})`,
              createdAt: new Date(),
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          organizationId: membership.organizationId,
          userId: session?.user?.id,
          action: "sale.create",
          resourceType: "Sale",
          resourceId: newSale.id,
          metadata: { transactionNo, total, itemCount: data.items.length },
        },
      });

      return newSale;
    });

    return { success: true, data: { saleId: sale.id, transactionNo: sale.transactionNo } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat transaksi";
    return { success: false, error: message };
  }
}

// ─── CANCEL SALE ───────────────────────────────────────────────────────────────

export async function cancelSale(formData: unknown): Promise<ActionResult> {
  let membership: MembershipData;
  try {
    membership = await requireMembership("sale:cancel");
  } catch {
    return { success: false, error: "Tidak memiliki izin untuk membatalkan transaksi" };
  }

  const validated = CancelSaleSchema.safeParse(formData);
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0]?.message ?? "Data tidak valid" };
  }

  const { saleId, reason } = validated.data;
  const session = await auth();

  try {
    await db.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: {
          id: saleId,
          organizationId: membership.organizationId,
          status: "COMPLETED",
        },
        include: {
          items: {
            select: {
              productId: true,
              quantity: true,
              productName: true,
            },
          },
        },
      });

      if (!sale) throw new Error("Transaksi tidak ditemukan atau sudah dibatalkan");

      // Kembalikan stok untuk setiap item (reversal)
      for (const item of sale.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { currentStock: true },
        });

        if (!product) continue;

        const newStock = product.currentStock + item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: newStock },
        });

        await tx.inventoryMovement.create({
          data: {
            organizationId: membership.organizationId,
            productId: item.productId,
            type: "RETURN",
            quantity: item.quantity,
            stockBefore: product.currentStock,
            stockAfter: newStock,
            reason: `Pembatalan transaksi ${sale.transactionNo}: ${reason}`,
            referenceId: sale.id,
            referenceType: "SALE",
            performedById: session?.user?.id,
          },
        });
      }

      // Update status sale
      await tx.sale.update({
        where: { id: saleId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: reason,
          cancelledById: session?.user?.id,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: membership.organizationId,
          userId: session?.user?.id,
          action: "sale.cancel",
          resourceType: "Sale",
          resourceId: saleId,
          metadata: { transactionNo: sale.transactionNo, reason },
        },
      });
    });

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membatalkan transaksi";
    return { success: false, error: message };
  }
}

// ─── GET SALES ────────────────────────────────────────────────────────────────

export async function getSales(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  from?: Date;
  to?: Date;
}) {
  const membership = await requireMembership("sale:read");
  const { page = 1, pageSize = 20, search, status, from, to } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    organizationId: membership.organizationId,
    ...(status && { status: status as "COMPLETED" | "CANCELLED" | "PENDING" | "REFUNDED" }),
    ...(from || to
      ? {
          soldAt: {
            ...(from && { gte: from }),
            ...(to && { lte: to }),
          },
        }
      : {}),
    ...(search && {
      OR: [
        { transactionNo: { contains: search, mode: "insensitive" as const } },
        { customer: { name: { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [items, total] = await db.$transaction([
    db.sale.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        items: { select: { id: true, productName: true, quantity: true, subtotal: true } },
      },
      orderBy: { soldAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.sale.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getSaleById(saleId: string) {
  const membership = await requireMembership("sale:read");

  const sale = await db.sale.findFirst({
    where: { id: saleId, organizationId: membership.organizationId },
    include: {
      customer: true,
      items: {
        include: { product: { select: { id: true, name: true, sku: true, imageUrl: true } } },
      },
    },
  });

  if (!sale) throw new Error("Transaksi tidak ditemukan");
  return sale;
}
