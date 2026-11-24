import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSuppliers } from "@/lib/actions/suppliers";
import { PageHeader } from "@/components/shared/PageHeader";
import { SupplierList } from "@/components/suppliers/SupplierList";

interface SuppliersPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search?.trim();

  const { items, total, totalPages } = await getSuppliers({
    page,
    pageSize: 20,
    search,
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Daftar Pemasok (Suppliers)"
        description="Kelola informasi pemasok barang dan mitra distributor bisnis Anda"
      />

      <SupplierList
        initialSuppliers={items}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        initialSearch={search}
      />
    </div>
  );
}
