"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
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

export async function getFinancialReport(params?: { from?: Date; to?: Date }) {
  const membership = await requireMembership("report:view");
  const orgId = membership.organizationId;

  const dateFilter = {
    ...(params?.from && { gte: params.from }),
    ...(params?.to && { lte: params.to }),
  };

  const hasDateFilter = params?.from || params?.to;

  const [salesAggregate, saleItems, expensesAggregate] = await Promise.all([
    // Omzet total dan jumlah transaksi selesai
    db.sale.aggregate({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        ...(hasDateFilter && { soldAt: dateFilter }),
      },
      _sum: {
        subtotal: true,
        discountAmount: true,
        taxAmount: true,
        total: true,
      },
      _count: { id: true },
    }),

    // Item penjualan untuk menghitung HPP (Harga Pokok Penjualan) berdasarkan Snapshot
    db.saleItem.findMany({
      where: {
        sale: {
          organizationId: orgId,
          status: "COMPLETED",
          ...(hasDateFilter && { soldAt: dateFilter }),
        },
      },
      select: {
        costPriceSnapshot: true,
        unitPriceSnapshot: true,
        quantity: true,
        subtotal: true,
        productName: true,
        productSku: true,
      },
    }),

    // Total Pengeluaran Operasional
    db.expense.aggregate({
      where: {
        organizationId: orgId,
        deletedAt: null,
        ...(hasDateFilter && { expenseDate: dateFilter }),
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ]);

  // Perhitungan:
  // 1. Omzet = Total nilai penjualan yang tercatat
  const omzet = Number(salesAggregate._sum.total ?? 0);
  const totalSubtotal = Number(salesAggregate._sum.subtotal ?? 0);
  const totalDiskon = Number(salesAggregate._sum.discountAmount ?? 0);
  const totalPajak = Number(salesAggregate._sum.taxAmount ?? 0);
  const totalTransaksi = salesAggregate._count.id;

  // 2. HPP (Harga Pokok Penjualan) = sum(costPriceSnapshot * quantity)
  let totalHPP = 0;
  for (const item of saleItems) {
    totalHPP += Number(item.costPriceSnapshot) * item.quantity;
  }

  // 3. Laba Kotor = Omzet (atau Subtotal setelah diskon) - HPP
  // Di sini pendapatan bersih dari barang = (totalSubtotal - totalDiskon)
  const pendapatanProduk = totalSubtotal - totalDiskon;
  const labaKotor = pendapatanProduk - totalHPP;
  const marginLabaKotor = pendapatanProduk > 0 ? (labaKotor / pendapatanProduk) * 100 : 0;

  // 4. Pengeluaran Operasional
  const totalPengeluaran = Number(expensesAggregate._sum.amount ?? 0);
  const jumlahPengeluaran = expensesAggregate._count.id;

  // 5. Estimasi Laba Bersih Operasional = Laba Kotor - Pengeluaran Operasional
  const estimasiLabaBersih = labaKotor - totalPengeluaran;

  return {
    ringkasan: {
      omzet,
      totalSubtotal,
      totalDiskon,
      totalPajak,
      totalTransaksi,
      totalHPP,
      labaKotor,
      marginLabaKotor,
      totalPengeluaran,
      jumlahPengeluaran,
      estimasiLabaBersih,
    },
  };
}

export async function getTopProductsReport(params?: { from?: Date; to?: Date; limit?: number }) {
  const membership = await requireMembership("report:view");
  const orgId = membership.organizationId;
  const limit = params?.limit ?? 10;

  const hasDateFilter = params?.from || params?.to;
  const dateFilter = {
    ...(params?.from && { gte: params.from }),
    ...(params?.to && { lte: params.to }),
  };

  const topItems = await db.saleItem.groupBy({
    by: ["productId", "productName", "productSku"],
    where: {
      sale: {
        organizationId: orgId,
        status: "COMPLETED",
        ...(hasDateFilter && { soldAt: dateFilter }),
      },
    },
    _sum: {
      quantity: true,
      subtotal: true,
    },
    orderBy: {
      _sum: {
        quantity: "desc",
      },
    },
    take: limit,
  });

  return topItems.map((item) => ({
    productId: item.productId,
    name: item.productName,
    sku: item.productSku,
    totalQty: item._sum.quantity ?? 0,
    totalRevenue: Number(item._sum.subtotal ?? 0),
  }));
}

export async function getStockMovementReport(params?: {
  productId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}) {
  const membership = await requireMembership("report:view");
  const orgId = membership.organizationId;
  const page = Math.max(1, params?.page ?? 1);
  const pageSize = params?.pageSize ?? 30;
  const skip = (page - 1) * pageSize;

  const where = {
    organizationId: orgId,
    ...(params?.productId && { productId: params.productId }),
    ...(params?.from || params?.to
      ? {
          performedAt: {
            ...(params.from && { gte: params.from }),
            ...(params.to && { lte: params.to }),
          },
        }
      : {}),
  };

  const [items, total] = await db.$transaction([
    db.inventoryMovement.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true, unit: true } },
      },
      orderBy: { performedAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.inventoryMovement.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
