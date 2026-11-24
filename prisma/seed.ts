/**
 * Seed script untuk data demo.
 * PERINGATAN: Hanya untuk environment lokal/demo.
 * Jangan jalankan di production.
 *
 * Jalankan: npx prisma db seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Memulai seed data demo...");

  // Buat user demo
  const passwordHash = await bcrypt.hash("Demo1234!", 12);

  const user = await db.user.upsert({
    where: { email: "demo@umkm-assistant.local" },
    update: {},
    create: {
      name: "Demo Owner",
      email: "demo@umkm-assistant.local",
      passwordHash,
    },
  });

  console.log("✅ User demo dibuat:", user.email);

  // Buat organisasi demo
  const org = await db.organization.upsert({
    where: { slug: "toko-berkah-jaya-demo" },
    update: {},
    create: {
      name: "Toko Berkah Jaya [DEMO]",
      slug: "toko-berkah-jaya-demo",
      businessType: "Retail / Toko",
      currency: "IDR",
      timezone: "Asia/Jakarta",
      phone: "0812-3456-7890",
      address: "Jl. Pahlawan No. 10, Jakarta",
      minStockThreshold: 5,
      taxRate: 11,
    },
  });

  console.log("✅ Organisasi demo dibuat:", org.name);

  // Buat membership
  await db.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: "OWNER",
      isActive: true,
    },
  });

  // Buat kategori
  const categories = await Promise.all([
    db.category.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Minuman" } },
      update: {},
      create: { organizationId: org.id, name: "Minuman", description: "Berbagai jenis minuman" },
    }),
    db.category.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Snack" } },
      update: {},
      create: { organizationId: org.id, name: "Snack", description: "Camilan dan snack" },
    }),
    db.category.upsert({
      where: { organizationId_name: { organizationId: org.id, name: "Kebutuhan Rumah" } },
      update: {},
      create: { organizationId: org.id, name: "Kebutuhan Rumah", description: "Perlengkapan rumah tangga" },
    }),
  ]);

  console.log("✅ Kategori demo dibuat:", categories.length);

  // Buat produk demo
  const products = [
    {
      sku: "MNM-001",
      name: "Air Mineral 600ml",
      categoryName: "Minuman",
      costPrice: 2500,
      sellingPrice: 4000,
      currentStock: 100,
      unit: "botol",
    },
    {
      sku: "MNM-002",
      name: "Teh Botol 500ml",
      categoryName: "Minuman",
      costPrice: 4000,
      sellingPrice: 7000,
      currentStock: 50,
      unit: "botol",
    },
    {
      sku: "SNK-001",
      name: "Keripik Singkong Pedas",
      categoryName: "Snack",
      costPrice: 5000,
      sellingPrice: 8500,
      currentStock: 30,
      unit: "bungkus",
      minStock: 5,
    },
    {
      sku: "SNK-002",
      name: "Wafer Coklat",
      categoryName: "Snack",
      costPrice: 3500,
      sellingPrice: 5500,
      currentStock: 3,     // sengaja stok menipis untuk demo
      unit: "bungkus",
      minStock: 5,
    },
    {
      sku: "RMH-001",
      name: "Sabun Cuci Piring 500gr",
      categoryName: "Kebutuhan Rumah",
      costPrice: 8000,
      sellingPrice: 12000,
      currentStock: 20,
      unit: "pcs",
    },
  ];

  for (const p of products) {
    const category = categories.find((c) => c.name === p.categoryName);

    const existing = await db.product.findFirst({
      where: { organizationId: org.id, sku: p.sku },
      select: { id: true },
    });

    if (!existing) {
      const created = await db.product.create({
        data: {
          organizationId: org.id,
          categoryId: category?.id,
          sku: p.sku,
          name: p.name,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          currentStock: p.currentStock,
          unit: p.unit,
          minStock: p.minStock,
          isActive: true,
        },
      });

      // Buat InventoryMovement untuk stok awal
      await db.inventoryMovement.create({
        data: {
          organizationId: org.id,
          productId: created.id,
          type: "INITIAL",
          quantity: p.currentStock,
          stockBefore: 0,
          stockAfter: p.currentStock,
          reason: "Stok awal (data demo)",
        },
      });
    }
  }

  console.log("✅ Produk demo dibuat:", products.length);

  // Buat kategori pengeluaran default
  const expenseCategories = ["Operasional", "Gaji & Upah", "Sewa", "Utilitas", "Pemasaran", "Lain-lain"];
  for (const name of expenseCategories) {
    await db.expenseCategory.upsert({
      where: { organizationId_name: { organizationId: org.id, name } },
      update: {},
      create: { organizationId: org.id, name },
    });
  }

  // Buat pelanggan demo
  await db.customer.upsert({
    where: { id: "demo-customer-001" },
    update: {},
    create: {
      id: "demo-customer-001",
      organizationId: org.id,
      name: "Budi Santoso [DEMO]",
      phone: "0813-1111-2222",
      address: "Jl. Merdeka No. 5, Jakarta",
    },
  });

  console.log("✅ Pelanggan demo dibuat");
  console.log("\n📋 Akun Demo:");
  console.log("   Email    : demo@umkm-assistant.local");
  console.log("   Password : Demo1234!");
  console.log("   Organisasi: Toko Berkah Jaya [DEMO]");
  console.log("\n⚠️  Data ini hanya untuk demo lokal. Jangan gunakan di production.");
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
