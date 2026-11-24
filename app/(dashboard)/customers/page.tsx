import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCustomers } from "@/lib/actions/customers";
import { PageHeader } from "@/components/shared/PageHeader";
import { CustomerList } from "@/components/customers/CustomerList";

interface CustomersPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search?.trim();

  const { items, total, totalPages } = await getCustomers({
    page,
    pageSize: 20,
    search,
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Daftar Pelanggan"
        description="Kelola basis pelanggan dan riwayat transaksi mereka"
      />

      <CustomerList
        initialCustomers={items}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        initialSearch={search}
      />
    </div>
  );
}
