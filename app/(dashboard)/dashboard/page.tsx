import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
} from "lucide-react";
import { SalesChart } from "@/components/dashboard/SalesChart";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: { organization: { select: { id: true, name: true } } },
  });

  if (!membership) redirect("/onboarding");

  const orgId = membership.organization.id;

  // Tanggal filter: hari ini dan 30 hari terakhir
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  // Query ringkasan
  const [
    todaySales,
    monthSales,
    topProducts,
    recentSales,
    dailySalesData,
  ] = await Promise.all([
    // Omzet hari ini
    db.sale.aggregate({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        soldAt: { gte: startOfToday },
      },
      _sum: { total: true },
      _count: { id: true },
    }),

    // Omzet 30 hari
    db.sale.aggregate({
      where: {
        organizationId: orgId,
        status: "COMPLETED",
        soldAt: { gte: thirtyDaysAgo },
      },
      _sum: { total: true },
      _count: { id: true },
    }),

    // Produk terlaris 30 hari
    db.saleItem.groupBy({
      by: ["productId", "productName"],
      where: {
        sale: {
          organizationId: orgId,
          status: "COMPLETED",
          soldAt: { gte: thirtyDaysAgo },
        },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),

    // 5 transaksi terbaru
    db.sale.findMany({
      where: { organizationId: orgId, status: "COMPLETED" },
      include: { customer: { select: { name: true } } },
      orderBy: { soldAt: "desc" },
      take: 5,
    }),

    // Data penjualan harian 30 hari untuk grafik
    db.$queryRaw<{ date: string; total: number; count: number }[]>`
      SELECT 
        DATE_TRUNC('day', "soldAt" AT TIME ZONE 'Asia/Jakarta')::date::text as date,
        SUM(total)::float as total,
        COUNT(id)::int as count
      FROM "Sale"
      WHERE "organizationId" = ${orgId}
        AND status = 'COMPLETED'
        AND "soldAt" >= ${thirtyDaysAgo}
      GROUP BY DATE_TRUNC('day', "soldAt" AT TIME ZONE 'Asia/Jakarta')::date
      ORDER BY date ASC
    `,
  ]);

  // Filter stok menipis dengan threshold dari org settings
  const orgSettings = await db.organization.findUnique({
    where: { id: orgId },
    select: { minStockThreshold: true },
  });

  const globalThreshold = orgSettings?.minStockThreshold ?? 5;
  const filteredLowStock = await db.product.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true, name: true, sku: true, currentStock: true, minStock: true },
    orderBy: { currentStock: "asc" },
    take: 20,
  }).then((products) =>
    products.filter((p) => {
      const threshold = p.minStock ?? globalThreshold;
      return p.currentStock <= threshold;
    }).slice(0, 5)
  );

  const omzetHariIni = Number(todaySales._sum.total ?? 0);
  const omzet30Hari = Number(monthSales._sum.total ?? 0);
  const transaksiHariIni = todaySales._count.id;
  const transaksi30Hari = monthSales._count.id;
  const rataRata30Hari =
    transaksi30Hari > 0 ? omzet30Hari / transaksi30Hari : 0;

  const hasData = transaksi30Hari > 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {membership.organization.name} &middot; {formatDate(now)}
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Omzet Hari Ini"
          value={formatCurrency(omzetHariIni)}
          sublabel={`${transaksiHariIni} transaksi`}
          icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
          color="green"
        />
        <SummaryCard
          label="Omzet 30 Hari"
          value={formatCurrency(omzet30Hari)}
          sublabel={`${transaksi30Hari} transaksi`}
          icon={<ShoppingCart className="h-5 w-5" aria-hidden="true" />}
          color="blue"
        />
        <SummaryCard
          label="Rata-rata Transaksi"
          value={formatCurrency(rataRata30Hari)}
          sublabel="30 hari terakhir"
          icon={<Package className="h-5 w-5" aria-hidden="true" />}
          color="indigo"
        />
        <SummaryCard
          label="Stok Menipis"
          value={String(filteredLowStock.length)}
          sublabel="produk"
          icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
          color={filteredLowStock.length > 0 ? "amber" : "gray"}
        />
      </div>

      {/* Chart + recent sales */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">
              Penjualan 30 Hari Terakhir
            </h2>
            {hasData ? (
              <Suspense fallback={<div className="h-48 animate-pulse rounded bg-gray-100" />}>
                <SalesChart data={dailySalesData} />
              </Suspense>
            ) : (
              <EmptyChartState />
            )}
          </div>
        </div>

        {/* Top products */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Produk Terlaris
          </h2>
          {topProducts.length > 0 ? (
            <ul className="space-y-3" role="list">
              {topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {p.productName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p._sum.quantity ?? 0} terjual
                    </p>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {formatCurrency(Number(p._sum.subtotal ?? 0), { compact: true })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">
              Belum ada data penjualan
            </p>
          )}
        </div>
      </div>

      {/* Low stock + Recent sales */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low stock */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Stok Menipis
          </h2>
          {filteredLowStock.length > 0 ? (
            <ul className="space-y-2" role="list">
              {filteredLowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">SKU: {p.sku}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    {p.currentStock} tersisa
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">
              Semua produk stoknya mencukupi
            </p>
          )}
        </div>

        {/* Recent sales */}
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">
            Transaksi Terbaru
          </h2>
          {recentSales.length > 0 ? (
            <ul className="space-y-2" role="list">
              {recentSales.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {s.transactionNo}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.customer?.name ?? "Tanpa nama"} &middot;{" "}
                      {formatDate(s.soldAt, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(Number(s.total))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">
              Belum ada transaksi
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type ColorKey = "green" | "blue" | "indigo" | "amber" | "gray";

const COLOR_MAP: Record<ColorKey, { bg: string; icon: string }> = {
  green: { bg: "bg-green-50", icon: "text-green-600" },
  blue: { bg: "bg-blue-50", icon: "text-blue-600" },
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-600" },
  amber: { bg: "bg-amber-50", icon: "text-amber-600" },
  gray: { bg: "bg-gray-50", icon: "text-gray-400" },
};

function SummaryCard({
  label,
  value,
  sublabel,
  icon,
  color = "green",
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ReactNode;
  color?: ColorKey;
}) {
  const { bg, icon: iconColor } = COLOR_MAP[color];
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
          <p className="mt-0.5 text-xs text-gray-500">{sublabel}</p>
        </div>
        <div className={`rounded-lg p-2 ${bg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg bg-gray-50">
      <div className="text-center">
        <p className="text-sm font-medium text-gray-500">Belum ada data penjualan</p>
        <p className="mt-1 text-xs text-gray-400">
          Data grafik akan muncul setelah ada transaksi
        </p>
      </div>
    </div>
  );
}
