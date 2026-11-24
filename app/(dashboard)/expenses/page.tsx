import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getExpenses, getExpenseCategories } from "@/lib/actions/expenses";
import { PageHeader } from "@/components/shared/PageHeader";
import { ExpenseList } from "@/components/expenses/ExpenseList";

interface ExpensesPageProps {
  searchParams: Promise<{
    categoryId?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const categoryId = params.categoryId;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  const [{ items, total, totalPages, totalAmount }, categories] = await Promise.all([
    getExpenses({
      categoryId,
      from,
      to,
      page,
      pageSize: 20,
    }),
    getExpenseCategories(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Catatan Pengeluaran"
        description="Kelola dan pantau semua pos pengeluaran operasional usaha Anda"
      />

      <ExpenseList
        initialExpenses={items}
        categories={categories}
        totalAmount={totalAmount}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        initialCategoryId={categoryId}
      />
    </div>
  );
}
