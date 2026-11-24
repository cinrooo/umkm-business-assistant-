"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteMember, updateMemberRole, removeMember } from "@/lib/actions/settings";
import { formatDate } from "@/lib/utils/format";
import { UserPlus, Trash2, Copy, Check, Loader2 } from "lucide-react";
import type { UserRole } from "@prisma/client";

interface MemberItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  joinedAt: Date;
}

interface InviteItem {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

interface MemberListProps {
  members: MemberItem[];
  invites: InviteItem[];
  currentUserRole: UserRole;
}

export function MemberList({ members, invites, currentUserRole }: MemberListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MANAGER" | "STAFF">("STAFF");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inviteEmail.trim()) {
      setError("Email anggota wajib diisi");
      return;
    }

    startTransition(async () => {
      const res = await inviteMember({
        email: inviteEmail.trim(),
        role: inviteRole,
      });

      if (!res.success) {
        setError(res.error);
        return;
      }

      setInviteUrl(res.data.inviteUrl);
      router.refresh();
    });
  };

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleRoleChange = (membershipId: string, newRole: "ADMIN" | "MANAGER" | "STAFF") => {
    startTransition(async () => {
      const res = await updateMemberRole({ membershipId, role: newRole });
      if (!res.success) {
        alert(res.error);
      }
      router.refresh();
    });
  };

  const handleRemove = (membershipId: string, name: string) => {
    if (!confirm(`Keluarkan ${name} dari organisasi?`)) return;

    startTransition(async () => {
      const res = await removeMember(membershipId);
      if (!res.success) {
        alert(res.error);
      }
      router.refresh();
    });
  };

  return (
    <div className="max-w-4xl space-y-8">
      {/* Active Members Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Anggota Aktif ({members.length})</h2>
            <p className="text-xs text-gray-500 mt-0.5">Kelola hak akses dan staf operasional</p>
          </div>
          {canManage && (
            <button
              onClick={() => {
                setInviteUrl(null);
                setInviteEmail("");
                setError(null);
                setIsInviteModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-green-700 cursor-pointer shadow-sm"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Undang Anggota
            </button>
          )}
        </div>

        <table className="min-w-full divide-y divide-gray-200 text-sm" aria-label="Daftar anggota tim">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Nama / Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Peran (Role)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Bergabung
              </th>
              {canManage && (
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-6 py-3.5">
                  <div className="font-semibold text-gray-900">{m.name}</div>
                  <div className="text-xs text-gray-500">{m.email}</div>
                </td>
                <td className="px-6 py-3.5">
                  {canManage && m.role !== "OWNER" ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as "ADMIN" | "MANAGER" | "STAFF")}
                      disabled={isPending}
                      className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs text-gray-900 bg-white cursor-pointer"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="MANAGER">MANAGER</option>
                      <option value="STAFF">STAFF</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        m.role === "OWNER"
                          ? "bg-purple-100 text-purple-700"
                          : m.role === "ADMIN"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {m.role}
                    </span>
                  )}
                </td>
                <td className="px-6 py-3.5 text-xs text-gray-500">
                  {formatDate(m.joinedAt, { day: "numeric", month: "short", year: "numeric" })}
                </td>
                {canManage && (
                  <td className="px-6 py-3.5 text-right">
                    {m.role !== "OWNER" && (
                      <button
                        onClick={() => handleRemove(m.id, m.name)}
                        disabled={isPending}
                        className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 cursor-pointer disabled:opacity-40"
                        title="Keluarkan dari tim"
                        aria-label={`Keluarkan ${m.name}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Undangan Menunggu Konfirmasi */}
      {invites.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Undangan Menunggu ({invites.length})</h2>
          </div>
          <div className="divide-y divide-gray-100 p-4 space-y-2">
            {invites.map((inv) => {
              const url = `${typeof window !== "undefined" ? window.location.origin : ""}/invite?token=${inv.token}`;
              return (
                <div key={inv.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <span className="font-semibold text-gray-900">{inv.email}</span>
                    <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 font-medium">{inv.role}</span>
                    <div className="text-gray-400 mt-0.5">
                      Berlaku hingga {formatDate(inv.expiresAt, { day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      alert("Link undangan disalin ke clipboard!");
                    }}
                    className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    <Copy className="h-3 w-3" aria-hidden="true" />
                    Salin Link
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Undang Anggota */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Undang Anggota Tim Baru</h2>
            <p className="text-xs text-gray-500 mt-1">
              Buat link undangan untuk bergabung ke organisasi bisnis Anda
            </p>

            {error && (
              <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            {!inviteUrl ? (
              <form onSubmit={handleInvite} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="inv-email" className="block text-sm font-medium text-gray-700">
                    Alamat Email Anggota <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="inv-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="nama@karyawan.com"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                    disabled={isPending}
                  />
                </div>

                <div>
                  <label htmlFor="inv-role" className="block text-sm font-medium text-gray-700">
                    Peran (Role)
                  </label>
                  <select
                    id="inv-role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MANAGER" | "STAFF")}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 cursor-pointer"
                    disabled={isPending}
                  >
                    <option value="STAFF">STAFF (Kasir, cek stok & catat penjualan)</option>
                    <option value="MANAGER">MANAGER (Kelola produk, inventaris, pengeluaran & laporan)</option>
                    <option value="ADMIN">ADMIN (Akses penuh termasuk pengaturan)</option>
                  </select>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
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
                    {isPending ? "Membuat link..." : "Buat Link Undangan"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-green-200 bg-green-50/60 p-4">
                  <p className="text-xs font-semibold text-green-900 mb-2">
                    Link Undangan Berhasil Dibuat!
                  </p>
                  <p className="text-xs text-green-700 mb-3">
                    Kirim link berikut kepada calon anggota melalui WhatsApp atau email:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={inviteUrl}
                      className="flex-1 rounded border border-green-300 bg-white p-2 text-xs font-mono text-gray-800"
                    />
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 rounded bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 cursor-pointer"
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {isCopied ? "Disalin!" : "Salin"}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 cursor-pointer"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
