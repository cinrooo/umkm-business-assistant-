"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpense, createExpenseCategory, deleteExpense } from "@/lib/actions/expenses";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils/format";
import { Plus, Trash2, Receipt, Loader2, FolderPlus } from "lucide-react";

interface ExpenseCategoryItem {
  id: string;
  name: string;
}

interface ExpenseItem {
  id: string;
  amount: unknown;
  paymentMethod: string;
  description: string;
  notes: string | null;
  expenseDate: Date;
  category: { id: string; name: string } | null;
}

interface ExpenseListProps {
  initialExpenses: ExpenseItem[];
  categories: ExpenseCategoryItem[];
  totalAmount: number;
  total: number;
  totalPages: number;
  currentPage: number;
  initialCategoryId?: string;
}

export function ExpenseList({
  initialExpenses,
  categories,
  totalAmount,
  total,
  totalPages,
  currentPage,
  initialCategoryId = "",
}: ExpenseListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);

  // Form expense state
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "DEBIT">("CASH");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // New category state
  const [newCatName, setNewCatName] = useState("");
  const [catError, setCatError] = useState<string | null>(null);

  const openCreateModal = () => {
    setDescription("");
    setAmount(0);
    setCategoryId(categories[0]?.id ?? "");
    setPaymentMethod("CASH");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError("Deskripsi pengeluaran wajib diisi");
      return;
    }

    if (amount <= 0) {
      setError("Jumlah pengeluaran harus lebih besar dari Rp 0");
      return;
    }

    startTransition(async () => {
      const res = await createExpense({
        description: description.trim(),
        amount,
        categoryId: categoryId || undefined,
        paymentMethod,
        expenseDate: new Date(expenseDate),
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

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);

    if (!newCatName.trim()) {
      setCatError("Nama kategori wajib diisi");
      return;
    }

    startTransition(async () => {
      const res = await createExpenseCategory({ name: newCatName.trim() });
      if (!res.success) {
        setCatError(res.error);
        return;
      }
      setIsCatModalOpen(false);
      setNewCatName("");
      router.refresh();
    });
  };

  const handleDelete = (id: string, desc: string) => {
    if (!confirm(`Hapus catatan pengeluaran "${desc}"?`)) return;

    startTransition(async () => {
      const res = await deleteExpense(id);
      if (!res.success) {
        alert(res.error);
      }
      router.refresh();
    });
  };

  return (
    <div>
      {/* Top Banner Total */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Pengeluaran Periode</p>
          <p className="mt-1.5 text-2xl font-bold text-red-600">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-gray-500 mt-1">{formatNumber(total)} transaksi tercatat</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Kategori Biaya</p>
            <div className="mt-1 flex items-center gap-2">
              <select
                aria-label="Filter kategori pengeluaran"
                value={initialCategoryId}
                onChange={(e) => {
                  const val = e.target.value;
                  router.push(val ? `/expenses?categoryId=${val}` : "/expenses");
                }}
                className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-800 focus:border-green-500 focus:outline-none"
              >
                <option value="">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setIsCatModalOpen(true)}
              className="mt-2 text-xs text-green-600 hover:text-green-700 flex items-center gap-1 cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
              + Tambah Kategori
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm flex items-center justify-end">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Catat Pengeluaran
          </button>
        </div>
      </div>

      {/* Tabel Pengeluaran */}
      {initialExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400">
            <Receipt className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Belum ada catatan pengeluaran</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Catat pengeluaran operasional toko seperti sewa, listrik, gaji, dan kebutuhan lainnya.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm" aria-label="Daftar pengeluaran">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tanggal
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Deskripsi Pengeluaran
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Kategori
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Metode Bayar
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Nominal
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {formatDate(exp.expenseDate, { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{exp.description}</div>
                    {exp.notes && <div className="text-xs text-gray-500 truncate max-w-xs">{exp.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                      {exp.category?.name ?? "Lain-lain"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {exp.paymentMethod}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-600">
                    {formatCurrency(Number(exp.amount))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(exp.id, exp.description)}
                      className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                      aria-label={`Hapus ${exp.description}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
          <div>Menampilkan total {total} pengeluaran</div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/expenses?page=${currentPage - 1}${initialCategoryId ? `&categoryId=${initialCategoryId}` : ""}`)}
              disabled={currentPage <= 1}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="px-2 py-1">Hal {currentPage} / {totalPages}</span>
            <button
              onClick={() => router.push(`/expenses?page=${currentPage + 1}${initialCategoryId ? `&categoryId=${initialCategoryId}` : ""}`)}
              disabled={currentPage >= totalPages}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {/* Modal Tambah Pengeluaran */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Catat Pengeluaran Baru</h2>

            {error && (
              <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="mt-4 space-y-4">
              <div>
                <label htmlFor="exp-desc" className="block text-sm font-medium text-gray-700">
                  Deskripsi / Keperluan <span className="text-red-500">*</span>
                </label>
                <input
                  id="exp-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Pembayaran Token Listrik Toko"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="exp-amount" className="block text-sm font-medium text-gray-700">
                  Nominal Pengeluaran <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 text-sm text-gray-500">Rp</span>
                  <input
                    id="exp-amount"
                    type="number"
                    min="1"
                    step="500"
                    value={amount || ""}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="250000"
                    className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exp-cat" className="block text-sm font-medium text-gray-700">
                    Kategori
                  </label>
                  <select
                    id="exp-cat"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer"
                    disabled={isPending}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="exp-date" className="block text-sm font-medium text-gray-700">
                    Tanggal
                  </label>
                  <input
                    id="exp-date"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Metode Bayar</label>
                <div className="mt-1 grid grid-cols-3 gap-2">
                  {(["CASH", "TRANSFER", "DEBIT"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`rounded-lg border py-1.5 text-xs font-medium cursor-pointer ${
                        paymentMethod === m
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {m === "CASH" ? "Tunai" : m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="exp-notes" className="block text-sm font-medium text-gray-700">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  id="exp-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan bon / struk..."
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
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  {isPending ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Kategori Biaya */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-gray-900">Tambah Kategori Pengeluaran</h2>

            {catError && (
              <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {catError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-4">
              <div>
                <label htmlFor="new-cat-name" className="block text-xs font-medium text-gray-700">
                  Nama Kategori
                </label>
                <input
                  id="new-cat-name"
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Contoh: Logistik & Kurir"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                  disabled={isPending}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60 cursor-pointer"
                >
                  {isPending ? "Menyimpan..." : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
