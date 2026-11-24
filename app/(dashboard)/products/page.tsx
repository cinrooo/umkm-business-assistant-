import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyProducts } from "@/components/shared/EmptyState";
import { Plus, Search } from "lucide-react";

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    categoryId?: string;
    status?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: session.user.id, isActive: true },
    select: { organizationId: true, role: true },
  });

  if (!membership) redirect("/onboarding");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const pageSize = 20;
  const search = params.search?.trim();
  const categoryId = params.categoryId;
  const isActive =
    params.status === "active" ? true : params.status === "inactive" ? false : undefined;

  const skip = (page - 1) * pageSize;

  const where = {
    organizationId: membership.organizationId,
    deletedAt: null,
    ...(typeof isActive === "boolean" && { isActive }),
    ...(categoryId && { categoryId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { sku: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [products, total, categories] = await db.$transaction([
    db.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
      skip,
      take: pageSize,
    }),
    db.product.count({ where }),
    db.category.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);
  const orgSettings = await db.organization.findUnique({
    where: { id: membership.organizationId },
    select: { minStockThreshold: true },
  });
  const globalThreshold = orgSettings?.minStockThreshold ?? 5;

  return (
    <div className="p-6">
      <PageHeader
        title="Produk"
        description={`${formatNumber(total)} produk terdaftar`}
        action={
          <Link
            href="/products/new"
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tambah Produk
          </Link>
        }
      />

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="GET" className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Cari nama atau SKU..."
              aria-label="Cari produk"
              className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          <select
            name="categoryId"
            defaultValue={categoryId ?? ""}
            aria-label="Filter kategori"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={params.status ?? ""}
            aria-label="Filter status"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>

          <button
            type="submit"
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 cursor-pointer"
          >
            Cari
          </button>
        </form>
      </div>

      {/* Products table */}
      {products.length === 0 ? (
        total === 0 && !search ? (
          <EmptyProducts
            action={
              <Link
                href="/products/new"
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Tambah Produk Pertama
              </Link>
            }
          />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white py-16 text-center">
            <p className="text-sm text-gray-500">Tidak ada produk yang cocok dengan filter.</p>
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" aria-label="Daftar produk">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Produk
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Kategori
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Stok
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Harga Jual
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {products.map((product) => {
                  const threshold = product.minStock ?? globalThreshold;
                  const isLowStock = product.currentStock <= threshold;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {product.category?.name ?? "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`text-sm font-medium ${
                            isLowStock ? "text-amber-600" : "text-gray-900"
                          }`}
                        >
                          {formatNumber(product.currentStock)} {product.unit}
                        </span>
                        {isLowStock && (
                          <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                            Menipis
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-900">
                          {formatCurrency(Number(product.sellingPrice))}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            product.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {product.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/products/${product.id}`}
                          className="text-sm font-medium text-green-600 hover:text-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1 rounded"
                        >
                          Lihat
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500">
                Halaman {page} dari {totalPages} ({formatNumber(total)} produk)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/products?page=${page - 1}${search ? `&search=${search}` : ""}`}
                    className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Sebelumnya
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/products?page=${page + 1}${search ? `&search=${search}` : ""}`}
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
