"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSale } from "@/lib/actions/sales";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Printer, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface SaleDetailProps {
  sale: {
    id: string;
    transactionNo: string;
    soldAt: Date;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    notes: string | null;
    cancelReason: string | null;
    cancelledAt: Date | null;
    customer: { name: string; phone: string | null } | null;
    items: {
      id: string;
      productName: string;
      productSku: string;
      unitPriceSnapshot: number;
      quantity: number;
      subtotal: number;
    }[];
  };
  organization: {
    name: string;
    address: string | null;
    phone: string | null;
  };
}

export function ReceiptView({ sale, organization }: SaleDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleCancelSale = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cancelReason.trim()) {
      setError("Alasan pembatalan wajib diisi");
      return;
    }

    startTransition(async () => {
      const res = await cancelSale({
        saleId: sale.id,
        reason: cancelReason.trim(),
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      setIsCancelModalOpen(false);
      router.refresh();
    });
  };

  const isCancelled = sale.status === "CANCELLED";

  return (
    <div className="max-w-xl mx-auto">
      {/* Top action bar (hidden on print) */}
      <div className="print:hidden mb-6 flex items-center justify-between">
        <Link
          href="/sales"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Daftar Transaksi
        </Link>

        <div className="flex items-center gap-2">
          {!isCancelled && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-100 cursor-pointer"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Batalkan Transaksi
            </button>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 cursor-pointer shadow-sm"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            Cetak Struk
          </button>
        </div>
      </div>

      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <div role="alert" className="print:hidden mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold flex items-center gap-1.5">
            <XCircle className="h-4 w-4" aria-hidden="true" />
            Transaksi Dibatalkan / Di-refund
          </div>
          <p className="mt-1 text-xs text-red-700">
            Alasan: &ldquo;{sale.cancelReason}&rdquo; · Waktu: {sale.cancelledAt ? formatDate(sale.cancelledAt, { hour: "2-digit", minute: "2-digit" }) : "-"}
          </p>
          <p className="mt-1 text-xs text-red-600">
            Stok produk telah dikembalikan otomatis ke inventaris.
          </p>
        </div>
      )}

      {/* Struk Fisik / Thermal Paper Style Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm font-mono text-xs text-gray-800 print:border-none print:shadow-none print:p-0">
        {/* Header Struk */}
        <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
          <h1 className="text-base font-bold uppercase tracking-wide text-gray-900">{organization.name}</h1>
          {organization.address && <p className="text-gray-500 mt-0.5">{organization.address}</p>}
          {organization.phone && <p className="text-gray-500">Telp: {organization.phone}</p>}
        </div>

        {/* Info Transaksi */}
        <div className="space-y-1 border-b border-dashed border-gray-300 pb-3 mb-3 text-gray-600">
          <div className="flex justify-between">
            <span>No. Transaksi:</span>
            <span className="font-bold text-gray-900">{sale.transactionNo}</span>
          </div>
          <div className="flex justify-between">
            <span>Waktu:</span>
            <span>{formatDate(sale.soldAt, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="flex justify-between">
            <span>Pelanggan:</span>
            <span>{sale.customer?.name ?? "Umum"}</span>
          </div>
          <div className="flex justify-between">
            <span>Metode Bayar:</span>
            <span>{sale.paymentMethod}</span>
          </div>
        </div>

        {/* Item List */}
        <div className="space-y-2 border-b border-dashed border-gray-300 pb-3 mb-3">
          <div className="font-semibold text-gray-700 flex justify-between">
            <span>ITEM</span>
            <span>TOTAL</span>
          </div>
          {sale.items.map((item) => (
            <div key={item.id} className="space-y-0.5">
              <div className="text-gray-900 font-medium">{item.productName}</div>
              <div className="flex justify-between text-gray-500">
                <span>
                  {item.quantity} x {formatCurrency(item.unitPriceSnapshot)}
                </span>
                <span className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Ringkasan Total */}
        <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-3 mb-4">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal:</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Diskon:</span>
              <span>-{formatCurrency(sale.discountAmount)}</span>
            </div>
          )}
          {sale.taxAmount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Pajak (PPN):</span>
              <span>{formatCurrency(sale.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {/* Footer Struk */}
        <div className="text-center text-gray-500 space-y-1">
          <p>Terima kasih atas kunjungan Anda!</p>
          <p className="text-[10px]">Barang yang sudah dibeli tidak dapat ditukar tanpa struk.</p>
        </div>
      </div>

      {/* Modal Batal Transaksi */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl font-sans">
            <h2 className="text-lg font-semibold text-gray-900">Batalkan Transaksi Penjualan</h2>
            <p className="text-xs text-gray-500 mt-1">
              Membatalkan transaksi akan mengembalikan stok produk ke inventaris secara otomatis dan mencatat reversal di audit trail.
            </p>

            {error && (
              <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleCancelSale} className="mt-4 space-y-4">
              <div>
                <label htmlFor="cancel-reason" className="block text-sm font-medium text-gray-700">
                  Alasan Pembatalan / Refund <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="cancel-reason"
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Pelanggan salah beli / barang cacat / salah input kasir"
                  className="mt-1 block w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                  disabled={isPending}
                />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                  disabled={isPending}
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {isPending ? "Membatalkan..." : "Konfirmasi Pembatalan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
