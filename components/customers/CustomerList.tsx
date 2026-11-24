"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomer, deleteCustomer } from "@/lib/actions/customers";
import { formatCurrency } from "@/lib/utils/format";
import { Plus, Edit2, Trash2, Search, Users, Phone, Mail, MapPin, Loader2 } from "lucide-react";

interface CustomerItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  totalOrders: number;
  totalSpent: number;
  createdAt: Date;
}

interface CustomerListProps {
  initialCustomers: CustomerItem[];
  total: number;
  totalPages: number;
  currentPage: number;
  initialSearch?: string;
}

export function CustomerList({
  initialCustomers,
  total,
  totalPages,
  currentPage,
  initialSearch = "",
}: CustomerListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cust: CustomerItem) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone ?? "");
    setEmail(cust.email ?? "");
    setAddress(cust.address ?? "");
    setNotes(cust.notes ?? "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/customers?search=${encodeURIComponent(search.trim())}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nama pelanggan wajib diisi");
      return;
    }

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingCustomer) {
        const res = await updateCustomer(editingCustomer.id, payload);
        if (!res.success) {
          setError(res.error);
          return;
        }
      } else {
        const res = await createCustomer(payload);
        if (!res.success) {
          setError(res.error);
          return;
        }
      }

      setIsModalOpen(false);
      router.refresh();
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data pelanggan "${name}"?`)) return;

    startTransition(async () => {
      const res = await deleteCustomer(id);
      if (!res.success) {
        alert(res.error);
      }
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, telp, atau email..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </form>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Pelanggan
        </button>
      </div>

      {initialCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400">
            <Users className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Belum ada pelanggan</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Simpan data kontak pelanggan untuk memantau riwayat transaksi mereka.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm" aria-label="Daftar pelanggan">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Nama Pelanggan
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Kontak
                </th>
                <th scope="col" className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Total Order
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Total Belanja
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialCustomers.map((cust) => (
                <tr key={cust.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{cust.name}</div>
                    {cust.address && (
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        <span className="truncate max-w-xs">{cust.address}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 space-y-0.5">
                    {cust.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-gray-400" aria-hidden="true" />
                        <span>{cust.phone}</span>
                      </div>
                    )}
                    {cust.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-gray-400" aria-hidden="true" />
                        <span>{cust.email}</span>
                      </div>
                    )}
                    {!cust.phone && !cust.email && <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-900">
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold">
                      {cust.totalOrders}x
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">
                    {formatCurrency(cust.totalSpent)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(cust)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                        aria-label={`Edit pelanggan ${cust.name}`}
                      >
                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDelete(cust.id, cust.name)}
                        className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        aria-label={`Hapus pelanggan ${cust.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
          <div>Menampilkan total {total} pelanggan</div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/customers?page=${currentPage - 1}`)}
              disabled={currentPage <= 1}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="px-2 py-1">Hal {currentPage} / {totalPages}</span>
            <button
              onClick={() => router.push(`/customers?page=${currentPage + 1}`)}
              disabled={currentPage >= totalPages}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 cursor-pointer"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingCustomer ? "Ubah Data Pelanggan" : "Tambah Pelanggan Baru"}
            </h2>

            {error && (
              <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="cust-name" className="block text-sm font-medium text-gray-700">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  id="cust-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="cust-phone" className="block text-sm font-medium text-gray-700">
                  Nomor HP / WhatsApp
                </label>
                <input
                  id="cust-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="cust-email" className="block text-sm font-medium text-gray-700">
                  Email (Opsional)
                </label>
                <input
                  id="cust-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="budi@example.com"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="cust-address" className="block text-sm font-medium text-gray-700">
                  Alamat
                </label>
                <textarea
                  id="cust-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat pengiriman / domisili..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="cust-notes" className="block text-sm font-medium text-gray-700">
                  Catatan Tambahan
                </label>
                <input
                  id="cust-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan preferensi atau akun IG..."
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
                  {isPending ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
