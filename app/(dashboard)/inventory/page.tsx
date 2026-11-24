import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { InventoryManager } from "@/components/inventory/InventoryManager";

interface InventoryPageProps {
  searchParams: Promise<{ productId?: string; search?: string }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    select: { organizationId: true, role: true },
  });

  if (!membership) redirect("/onboarding");

  const params = await searchParams;

  // Ambil daftar produk untuk pilihan dropdown penyesuaian stok
  const [products, movements, org] = await Promise.all([
    db.product.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        unit: true,
        minStock: true,
      },
      orderBy: { name: "asc" },
    }),

    // 25 pergerakan stok terbaru
    db.inventoryMovement.findMany({
      where: {
        organizationId: membership.organizationId,
        ...(params.productId && { productId: params.productId }),
      },
      include: {
        product: { select: { id: true, name: true, sku: true, unit: true } },
      },
      orderBy: { performedAt: "desc" },
      take: 30,
    }),

    db.organization.findUnique({
      where: { id: membership.organizationId },
      select: { minStockThreshold: true, allowNegativeStock: true },
    }),
  ]);

  const globalThreshold = org?.minStockThreshold ?? 5;

  return (
    <div className="p-6">
      <PageHeader
        title="Inventaris & Manajemen Stok"
        description="Pantau ketersediaan stok, catat barang masuk, dan lakukan audit stok opname"
      />

      <InventoryManager
        products={products}
        movements={movements}
        preselectedProductId={params.productId}
        globalThreshold={globalThreshold}
        allowNegativeStock={org?.allowNegativeStock ?? false}
      />
    </div>
  );
}
