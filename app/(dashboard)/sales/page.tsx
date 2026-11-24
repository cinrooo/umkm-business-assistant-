import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSales } from "@/lib/actions/sales";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { Plus, Search, ShoppingCart, Eye } from "lucide-react";

interface SalesPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search?.trim();
  const status = params.status;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  const { items, total, totalPages } = await getSales({
    page,
    pageSize: 20,
    search,
    status,
    from,
    to,
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Transaksi Penjualan"
        description={`${formatNumber(total)} transaksi tercatat`}
        action={
          <Link
            href="/sales/new"
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Transaksi Baru (Kasir)
          </Link>
        }
      />

      {/* Filter Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="GET" className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Cari nomor struk atau pelanggan..."
              aria-label="Cari transaksi"
              className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          <select
            name="status"
            defaultValue={status ?? ""}
            aria-label="Filter status transaksi"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="COMPLETED">Selesai (Lunas)</option>
            <option value="CANCELLED">Dibatalkan</option>
            <option value="PENDING">Tertunda</option>
          </select>

          <button
            type="submit"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 cursor-pointer"
          >
            Filter
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400">
            <ShoppingCart className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Belum ada transaksi</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Mulai catat transaksi penjualan pertama Anda melalui menu kasir.
          </p>
          <div className="mt-6">
            <Link
              href="/sales/new"
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Buka Kasir Sekarang
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" aria-label="Daftar transaksi penjualan">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    No. Transaksi
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Waktu
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Pelanggan
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Metode Bayar
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {items.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {sale.transactionNo}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(sale.soldAt, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {sale.customer?.name ?? <span className="text-gray-400 italic">Umum</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <span className="rounded bg-gray-100 px-2 py-0.5 font-medium">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      {formatCurrency(Number(sale.total))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          sale.status === "COMPLETED"
                            ? "bg-green-100 text-green-700"
                            : sale.status === "CANCELLED"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {sale.status === "COMPLETED"
                          ? "Selesai"
                          : sale.status === "CANCELLED"
                          ? "Dibatalkan"
                          : sale.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/sales/${sale.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 rounded p-1 hover:bg-green-50"
                        title="Lihat Detail & Struk"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Struk
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">
                Halaman {page} dari {totalPages} ({formatNumber(total)} transaksi)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/sales?page=${page - 1}${search ? `&search=${search}` : ""}`}
                    className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Sebelumnya
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/sales?page=${page + 1}${search ? `&search=${search}` : ""}`}
                    className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Berikutnya
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
