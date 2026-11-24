"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adjustStock } from "@/lib/actions/products";
import { formatNumber, formatDate } from "@/lib/utils/format";
import { PlusCircle, AlertTriangle, History, ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  unit: string;
  minStock: number | null;
}

interface MovementItem {
  id: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  reason: string | null;
  notes: string | null;
  performedAt: Date;
  product: { id: string; name: string; sku: string; unit: string };
}

interface InventoryManagerProps {
  products: ProductItem[];
  movements: MovementItem[];
  preselectedProductId?: string;
  globalThreshold: number;
  allowNegativeStock: boolean;
}

export function InventoryManager({
  products,
  movements,
  preselectedProductId,
  globalThreshold,
  allowNegativeStock,
}: InventoryManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(!!preselectedProductId);
  const [selectedProductId, setSelectedProductId] = useState(preselectedProductId ?? (products[0]?.id ?? ""));
  const [type, setType] = useState<"PURCHASE" | "ADJUSTMENT" | "LOSS">("PURCHASE");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleOpenModal = (productId?: string) => {
    if (productId) setSelectedProductId(productId);
    setQuantity(1);
    setReason("");
    setNotes("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProductId) {
      setError("Pilih produk terlebih dahulu");
      return;
    }

    if (quantity === 0) {
      setError("Jumlah perubahan tidak boleh 0");
      return;
    }

    if (!reason.trim()) {
      setError("Alasan perubahan stok wajib diisi untuk keperluan audit");
      return;
    }

    // Hitung stok estimasi
    const factor = type === "PURCHASE" ? Math.abs(quantity) : type === "LOSS" ? -Math.abs(quantity) : quantity;
    const estimatedNewStock = (selectedProduct?.currentStock ?? 0) + factor;

    if (!allowNegativeStock && estimatedNewStock < 0) {
      setError(`Stok tidak boleh negatif! Sisa stok saat ini ${selectedProduct?.currentStock}, pengurangan ${Math.abs(factor)}.`);
      return;
    }

    startTransition(async () => {
      const res = await adjustStock({
        productId: selectedProductId,
        type,
        quantity: factor,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      setIsModalOpen(false);
      router.refresh();
    });
  };

  // Hitung jumlah produk dengan stok menipis
  const lowStockCount = products.filter((p) => {
    const threshold = p.minStock ?? globalThreshold;
    return p.currentStock <= threshold;
  }).length;

  return (
    <div>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Macam Produk</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{formatNumber(products.length)}</p>
          <p className="text-xs text-gray-500 mt-1">Item aktif dalam database</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Stok Menipis / Kritis</p>
          <p className="mt-1.5 text-2xl font-bold text-amber-600">{formatNumber(lowStockCount)}</p>
          <p className="text-xs text-gray-500 mt-1">Perlu restock segera</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Aksi Cepat Inventaris</p>
            <p className="text-xs text-gray-500 mt-1">Catat barang masuk atau penyesuaian</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            Catat Mutasi Stok
          </button>
        </div>
      </div>

      {/* Tabs or Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Tabel Status Stok Semua Produk */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-5 py-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Status Stok Produk</h2>
          </div>
          <div className="overflow-x-auto max-h-[500px]">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Produk / SKU
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Stok Saat Ini
                  </th>
                  <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => {
                  const threshold = p.minStock ?? globalThreshold;
                  const isLow = p.currentStock <= threshold;

                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {formatNumber(p.currentStock)} {p.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                            Menipis (≤{threshold})
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            Cukup
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenModal(p.id)}
                          className="rounded px-2.5 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 cursor-pointer"
                        >
                          Sesuaikan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kolom Kanan: 15 Riwayat Mutasi Stok Terakhir */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-gray-200 px-5 py-4 flex items-center gap-2">
            <History className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <h2 className="text-base font-semibold text-gray-900">Riwayat Mutasi Terkini</h2>
          </div>
          <div className="overflow-y-auto max-h-[500px] p-3 space-y-3">
            {movements.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">Belum ada riwayat mutasi stok.</p>
            ) : (
              movements.map((m) => (
                <div key={m.id} className="rounded-lg border border-gray-100 p-3 bg-gray-50/50 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-gray-900 truncate max-w-[150px]">
                      {m.product.name}
                    </span>
                    <span className="font-bold flex items-center">
                      {m.quantity >= 0 ? (
                        <span className="text-green-600 flex items-center">
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" /> +{m.quantity}
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center">
                          <ArrowDownRight className="h-3.5 w-3.5" aria-hidden="true" /> {m.quantity}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-gray-500 flex justify-between">
                    <span>{m.type} · Sisa: {m.stockAfter} {m.product.unit}</span>
                    <span>
                      {formatDate(m.performedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {m.reason && <div className="mt-1 text-gray-600 italic">&ldquo;{m.reason}&rdquo;</div>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Dialog Form Mutasi Stok */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Catat Mutasi / Koreksi Stok</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Setiap perubahan stok akan dicatat dalam audit trail permanen
            </p>

            {error && (
              <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="inv-product" className="block text-sm font-medium text-gray-700">
                  Produk <span className="text-red-500">*</span>
                </label>
                <select
                  id="inv-product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer"
                  disabled={isPending}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Jenis Mutasi</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("PURCHASE")}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer ${
                      type === "PURCHASE"
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    + Stok Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("ADJUSTMENT")}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer ${
                      type === "ADJUSTMENT"
                        ? "border-green-600 bg-green-50 text-green-700"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Opname (+/-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("LOSS")}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer ${
                      type === "LOSS"
                        ? "border-red-600 bg-red-50 text-red-700"
                        : "border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    - Susut / Rusak
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="inv-qty" className="block text-sm font-medium text-gray-700">
                  Jumlah Satuan ({selectedProduct?.unit ?? "unit"}) <span className="text-red-500">*</span>
                </label>
                <input
                  id="inv-qty"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                  placeholder="Contoh: 10"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="inv-reason" className="block text-sm font-medium text-gray-700">
                  Alasan Perubahan <span className="text-red-500">*</span>
                </label>
                <input
                  id="inv-reason"
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: Kulakan dari supplier A / Koreksi opname bulanan"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="inv-notes" className="block text-sm font-medium text-gray-700">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  id="inv-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Nomor faktur / catatan fisik..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                  disabled={isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {isPending ? "Menyimpan..." : "Simpan Mutasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
