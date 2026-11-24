import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSaleById } from "@/lib/actions/sales";
import { ReceiptView } from "@/components/sales/ReceiptView";

interface SaleDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SaleDetailPage({ params }: SaleDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const sale = await getSaleById(id);

  const org = await db.organization.findUnique({
    where: { id: sale.organizationId },
    select: { name: true, address: true, phone: true },
  });

  const formattedSale = {
    ...sale,
    subtotal: Number(sale.subtotal),
    discountAmount: Number(sale.discountAmount),
    taxAmount: Number(sale.taxAmount),
    total: Number(sale.total),
    items: sale.items.map((item) => ({
      ...item,
      unitPriceSnapshot: Number(item.unitPriceSnapshot),
      subtotal: Number(item.subtotal),
    })),
  };

  return (
    <div className="p-6">
      <ReceiptView
        sale={formattedSale}
        organization={{
          name: org?.name ?? "UMKM Assistant",
          address: org?.address ?? null,
          phone: org?.phone ?? null,
        }}
      />
    </div>
  );
}
