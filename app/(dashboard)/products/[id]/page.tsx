import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProductById } from "@/lib/actions/products";
import { getCategories } from "@/lib/actions/categories";
import { getStockMovementReport } from "@/lib/actions/reports";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils/format";
import { ProductForm } from "@/components/products/ProductForm";
import Link from "next/link";
import { ArrowLeft, Package, History, TrendingUp } from "lucide-react";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const product = await getProductById(id);
  const categories = await getCategories();
  const movementHistory = await getStockMovementReport({ productId: id, pageSize: 10 });

  const cost = Number(product.costPrice);
  const price = Number(product.sellingPrice);
  const profitRp = price - cost;
  const profitMarginPercent = price > 0 ? (profitRp / price) * 100 : 0;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-4">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke Daftar Produk
        </Link>
      </div>

      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku} · Ditambahkan ${formatDate(product.createdAt)}`}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mb-8">
        {/* Ringkasan Stok & Finansial */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Package className="h-4 w-4 text-green-600" aria-hidden="true" />
            <span>Status Stok</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {formatNumber(product.currentStock)}{" "}
            <span className="text-base font-normal text-gray-500">{product.unit}</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {product.minStock !== null ? (
              <>Batas peringatan minimum: {product.minStock} {product.unit}</>
            ) : (
              "Mengikuti batas default bisnis"
            )}
          </p>
          <div className="mt-4">
            <Link
              href={`/inventory?productId=${product.id}`}
              className="inline-flex text-xs font-medium text-green-600 hover:text-green-700"
            >
              Sesuaikan Stok di Inventaris &rarr;
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
            <span>Harga & Keuntungan</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Harga Modal (HPP):</span>
              <span className="font-medium text-gray-900">{formatCurrency(cost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Harga Jual:</span>
              <span className="font-bold text-green-700">{formatCurrency(price)}</span>
            </div>
            <div className="border-t border-gray-100 pt-2 flex justify-between">
              <span className="text-gray-500">Potensi Laba / Unit:</span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(profitRp)} ({profitMarginPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Informasi Lain</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Kategori:</span>
              <span className="font-medium text-gray-900">{product.category?.name ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Barcode:</span>
              <span className="font-mono text-xs text-gray-900">{product.barcode ?? "-"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status:</span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                }`}
              >
                {product.isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Edit Produk */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Informasi Produk</h2>
        <ProductForm
          initialData={{
            id: product.id,
            name: product.name,
            sku: product.sku,
            categoryId: product.categoryId,
            description: product.description,
            unit: product.unit,
            costPrice: Number(product.costPrice),
            sellingPrice: Number(product.sellingPrice),
            minStock: product.minStock,
            barcode: product.barcode,
            isActive: product.isActive,
          }}
          categories={categories}
          isEdit={true}
        />
      </div>

      {/* Riwayat Pergerakan Stok Produk */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gray-500" aria-hidden="true" />
          <h2 className="text-base font-semibold text-gray-900">Riwayat Stok Terakhir</h2>
        </div>

        {movementHistory.items.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Belum ada catatan mutasi stok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Waktu
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Jenis
                  </th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Perubahan
                  </th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Sisa Stok
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Keterangan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movementHistory.items.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                      {formatDate(m.performedAt, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {m.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      <span className={m.quantity >= 0 ? "text-green-600" : "text-red-600"}>
                        {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900 font-semibold">
                      {m.stockAfter}
                    </td>
                    <td className="px-3 py-2 text-gray-500 truncate max-w-xs">
                      {m.reason || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
