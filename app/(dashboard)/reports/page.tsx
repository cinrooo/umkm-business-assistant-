import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFinancialReport, getTopProductsReport, getStockMovementReport } from "@/lib/actions/reports";
import { PageHeader } from "@/components/shared/PageHeader";
import { ReportDashboard } from "@/components/reports/ReportDashboard";

interface ReportsPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  const [{ ringkasan }, topProducts, stockMovements] = await Promise.all([
    getFinancialReport({ from, to }),
    getTopProductsReport({ from, to, limit: 15 }),
    getStockMovementReport({ from, to, pageSize: 30 }),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Laporan & Analitik Bisnis"
        description="Analisis performa penjualan, laba kotor aktual, pengeluaran operasional, dan mutasi stok"
      />

      <ReportDashboard
        financial={ringkasan}
        topProducts={topProducts}
        stockMovements={stockMovements.items}
        dateRange={{ from: params.from, to: params.to }}
      />
    </div>
  );
}
