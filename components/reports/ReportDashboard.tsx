"use client";

import { useState } from "react";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils/format";
import { Download } from "lucide-react";

interface ReportDashboardProps {
  financial: {
    omzet: number;
    totalSubtotal: number;
    totalDiskon: number;
    totalPajak: number;
    totalTransaksi: number;
    totalHPP: number;
    labaKotor: number;
    marginLabaKotor: number;
    totalPengeluaran: number;
    jumlahPengeluaran: number;
    estimasiLabaBersih: number;
  };
  topProducts: {
    productId: string;
    name: string;
    sku: string;
    totalQty: number;
    totalRevenue: number;
  }[];
  stockMovements: {
    id: string;
    type: string;
    quantity: number;
    stockBefore: number;
    stockAfter: number;
    reason: string | null;
    performedAt: Date;
    product: { name: string; sku: string; unit: string };
  }[];
  dateRange: { from?: string; to?: string };
}

export function ReportDashboard({
  financial,
  topProducts,
  stockMovements,
  dateRange,
}: ReportDashboardProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "products" | "stock">("summary");

  const exportSalesCsv = () => {
    const headers = ["Metrik", "Nilai (Rp)"];
    const rows = [
      ["Total Omzet", financial.omzet],
      ["Subtotal Kotor", financial.totalSubtotal],
      ["Total Diskon", financial.totalDiskon],
      ["Total Pajak (PPN)", financial.totalPajak],
      ["Jumlah Transaksi", financial.totalTransaksi],
      ["HPP (Harga Pokok Penjualan Snapshot)", financial.totalHPP],
      ["Laba Kotor (Omzet Bersih - HPP)", financial.labaKotor],
      ["Margin Laba Kotor (%)", `${financial.marginLabaKotor.toFixed(1)}%`],
      ["Pengeluaran Operasional", financial.totalPengeluaran],
      ["Estimasi Laba Bersih Operasional", financial.estimasiLabaBersih],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-bisnis-${dateRange.from ?? "awal"}-sd-${dateRange.to ?? "hari-ini"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Filter and Export Bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["summary", "products", "stock"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                activeTab === tab
                  ? "bg-green-600 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab === "summary"
                ? "Laporan Laba Rugi"
                : tab === "products"
                ? "Produk Terlaris"
                : "Mutasi Stok"}
            </button>
          ))}
        </div>

        <button
          onClick={exportSalesCsv}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer shadow-sm"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Ekspor Ringkasan (CSV)
        </button>
      </div>

      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* Card Formula Explanation - Explicit Financial Transparency */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 space-y-1">
            <p className="font-semibold text-blue-950">Transparansi Rumus Finansial Bisnis:</p>
            <p>· <strong>Omzet:</strong> Total nilai kas masuk dari penjualan yang telah selesai setelah diskon & pajak.</p>
            <p>· <strong>Laba Kotor:</strong> Pendapatan Penjualan Bersih dikurangi HPP (Harga modal aktual pada saat transaksi terjadi / snapshot).</p>
            <p>· <strong>Estimasi Laba Bersih:</strong> Laba Kotor dikurangi Total Pengeluaran Operasional yang dicatat pada periode ini.</p>
          </div>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Omzet Penjualan</span>
              <p className="mt-1.5 text-2xl font-bold text-gray-900">{formatCurrency(financial.omzet)}</p>
              <p className="mt-0.5 text-xs text-gray-500">{financial.totalTransaksi} transaksi selesai</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Laba Kotor (Gross Profit)</span>
              <p className="mt-1.5 text-2xl font-bold text-green-700">{formatCurrency(financial.labaKotor)}</p>
              <p className="mt-0.5 text-xs text-green-600 font-medium">Margin: {financial.marginLabaKotor.toFixed(1)}%</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Pengeluaran Operasional</span>
              <p className="mt-1.5 text-2xl font-bold text-red-600">{formatCurrency(financial.totalPengeluaran)}</p>
              <p className="mt-0.5 text-xs text-gray-500">{financial.jumlahPengeluaran} pos biaya</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Estimasi Laba Bersih</span>
              <p className={`mt-1.5 text-2xl font-bold ${financial.estimasiLabaBersih >= 0 ? "text-blue-700" : "text-red-700"}`}>
                {formatCurrency(financial.estimasiLabaBersih)}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">Laba Kotor - Biaya Operasional</p>
            </div>
          </div>

          {/* Rincian Finansial Tabel */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Laporan Laba Rugi Sederhana</h3>
            <div className="divide-y divide-gray-100 text-sm">
              <div className="py-2.5 flex justify-between font-medium">
                <span className="text-gray-700">1. Total Penjualan Kotor (Subtotal)</span>
                <span className="text-gray-900">{formatCurrency(financial.totalSubtotal)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-gray-600 pl-4">
                <span>Potongan / Diskon Penjualan</span>
                <span className="text-red-600">-{formatCurrency(financial.totalDiskon)}</span>
              </div>
              <div className="py-2.5 flex justify-between font-semibold bg-gray-50/50 px-2 rounded">
                <span className="text-gray-900">Pendapatan Bersih Penjualan</span>
                <span className="text-gray-900">{formatCurrency(financial.totalSubtotal - financial.totalDiskon)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-gray-600 pl-4">
                <span>HPP (Harga Pokok Penjualan Snapshot)</span>
                <span className="text-red-600">-{formatCurrency(financial.totalHPP)}</span>
              </div>
              <div className="py-2.5 flex justify-between font-bold text-green-700 bg-green-50/40 px-2 rounded">
                <span>LABA KOTOR BISNIS</span>
                <span>{formatCurrency(financial.labaKotor)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-gray-600 pl-4">
                <span>Total Pengeluaran Operasional & Biaya</span>
                <span className="text-red-600">-{formatCurrency(financial.totalPengeluaran)}</span>
              </div>
              <div className="py-3 flex justify-between text-base font-bold bg-blue-50/50 px-2 rounded text-blue-900">
                <span>ESTIMASI LABA BERSIH OPERASIONAL</span>
                <span>{formatCurrency(financial.estimasiLabaBersih)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "products" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Peringkat Produk Terlaris</h3>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Belum ada data penjualan produk.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      No
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Nama Produk / SKU
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Jumlah Terjual
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Total Omzet Produk
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topProducts.map((p, idx) => (
                    <tr key={p.productId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs font-semibold text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {formatNumber(p.totalQty)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">
                        {formatCurrency(p.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "stock" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Audit Trail Riwayat Mutasi Stok</h3>
          {stockMovements.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Belum ada mutasi stok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Waktu
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Produk
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Jenis
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Perubahan
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Sisa Stok
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Alasan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stockMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {formatDate(m.performedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {m.product.name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                          {m.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        <span className={m.quantity >= 0 ? "text-green-600" : "text-red-600"}>
                          {m.quantity >= 0 ? `+${m.quantity}` : m.quantity} {m.product.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {m.stockAfter} {m.product.unit}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 truncate max-w-xs">
                        {m.reason || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
