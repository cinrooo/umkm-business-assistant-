import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/PageHeader";
import { PosCheckout } from "@/components/sales/PosCheckout";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewSalePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    select: { organizationId: true, role: true },
  });

  if (!membership) redirect("/onboarding");

  const [products, customers, org] = await Promise.all([
    db.product.findMany({
      where: {
        organizationId: membership.organizationId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        sellingPrice: true,
        currentStock: true,
        category: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.customer.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    db.organization.findUnique({
      where: { id: membership.organizationId },
      select: { taxRate: true, allowNegativeStock: true },
    }),
  ]);

  const formattedProducts = products.map((p) => ({
    ...p,
    sellingPrice: Number(p.sellingPrice),
  }));

  return (
    <div className="p-6">
      <div className="mb-4">
        <Link
          href="/sales"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Daftar Transaksi
        </Link>
      </div>

      <PageHeader
        title="Kasir / Transaksi Baru"
        description="Pilih barang belanjaan dan proses pembayaran secara instan"
      />

      <PosCheckout
        products={formattedProducts}
        customers={customers}
        taxRate={Number(org?.taxRate ?? 0)}
        allowNegativeStock={org?.allowNegativeStock ?? false}
      />
    </div>
  );
}
