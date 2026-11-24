"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupplier, updateSupplier, deleteSupplier } from "@/lib/actions/suppliers";
import { Plus, Edit2, Trash2, Search, Truck, Phone, Mail, MapPin, User, Loader2 } from "lucide-react";

interface SupplierItem {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: Date;
}

interface SupplierListProps {
  initialSuppliers: SupplierItem[];
  total: number;
  totalPages: number;
  currentPage: number;
  initialSearch?: string;
}

export function SupplierList({
  initialSuppliers,
  total,
  totalPages,
  currentPage,
  initialSearch = "",
}: SupplierListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);

  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: SupplierItem) => {
    setEditingSupplier(s);
    setName(s.name);
    setContactPerson(s.contactPerson ?? "");
    setPhone(s.phone ?? "");
    setEmail(s.email ?? "");
    setAddress(s.address ?? "");
    setNotes(s.notes ?? "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/suppliers?search=${encodeURIComponent(search.trim())}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nama pemasok wajib diisi");
      return;
    }

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingSupplier) {
        const res = await updateSupplier(editingSupplier.id, payload);
        if (!res.success) {
          setError(res.error);
          return;
        }
      } else {
        const res = await createSupplier(payload);
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
    if (!confirm(`Apakah Anda yakin ingin menghapus data pemasok "${name}"?`)) return;

    startTransition(async () => {
      const res = await deleteSupplier(id);
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
            placeholder="Cari nama toko, kontak, atau telp..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
          />
        </form>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tambah Pemasok
        </button>
      </div>

      {initialSuppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4 text-gray-400">
            <Truck className="h-8 w-8" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">Belum ada pemasok</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            Catat data distributor, agen, atau supplier tempat Anda membeli stok barang.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm" aria-label="Daftar pemasok">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Nama Pemasok
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Kontak Person
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Telepon / Email
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initialSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{s.name}</div>
                    {s.address && (
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        <span className="truncate max-w-xs">{s.address}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {s.contactPerson ? (
                      <span className="flex items-center gap-1 text-gray-800">
                        <User className="h-3 w-3 text-gray-400" aria-hidden="true" />
                        {s.contactPerson}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 space-y-0.5">
                    {s.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-gray-400" aria-hidden="true" />
                        <span>{s.phone}</span>
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-gray-400" aria-hidden="true" />
                        <span>{s.email}</span>
                      </div>
                    )}
                    {!s.phone && !s.email && <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(s)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
                        aria-label={`Edit pemasok ${s.name}`}
                      >
                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        aria-label={`Hapus pemasok ${s.name}`}
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
          <div>Menampilkan total {total} pemasok</div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/suppliers?page=${currentPage - 1}`)}
              disabled={currentPage <= 1}
              className="rounded border border-gray-300 px-3 py-1 disabled:opacity-40 cursor-pointer"
            >
              Sebelumnya
            </button>
            <span className="px-2 py-1">Hal {currentPage} / {totalPages}</span>
            <button
              onClick={() => router.push(`/suppliers?page=${currentPage + 1}`)}
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
              {editingSupplier ? "Ubah Data Pemasok" : "Tambah Pemasok Baru"}
            </h2>

            {error && (
              <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="sup-name" className="block text-sm font-medium text-gray-700">
                  Nama Pemasok / Agen <span className="text-red-500">*</span>
                </label>
                <input
                  id="sup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: PT Sumber Pangan Makmur"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="sup-contact" className="block text-sm font-medium text-gray-700">
                  Nama Kontak (PIC Sales)
                </label>
                <input
                  id="sup-contact"
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Contoh: Pak Anton"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="sup-phone" className="block text-sm font-medium text-gray-700">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  id="sup-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="sup-email" className="block text-sm font-medium text-gray-700">
                  Email (Opsional)
                </label>
                <input
                  id="sup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sales@pemasok.com"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  disabled={isPending}
                />
              </div>

              <div>
                <label htmlFor="sup-address" className="block text-sm font-medium text-gray-700">
                  Alamat Gudang / Kantor
                </label>
                <textarea
                  id="sup-address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat kantor atau lokasi gudang..."
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
