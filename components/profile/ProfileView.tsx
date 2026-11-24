"use client";

import { signOut } from "next-auth/react";
import { formatDate } from "@/lib/utils/format";
import { LogOut, Building, Shield } from "lucide-react";

interface ProfileViewProps {
  user: {
    name: string;
    email: string;
    createdAt: Date;
  };
  organization: {
    name: string;
    businessType: string | null;
    role: string;
    joinedAt: Date;
  };
}

export function ProfileView({ user, organization }: ProfileViewProps) {
  const handleLogout = () => {
    if (confirm("Apakah Anda yakin ingin keluar dari akun?")) {
      signOut({ callbackUrl: "/login" });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* User Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-700">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400 mt-1">
              Akun dibuat pada {formatDate(user.createdAt, { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Organization Membership Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-3">
          Organisasi Bisnis Aktif
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <div className="flex items-start gap-3">
            <Building className="h-4 w-4 text-gray-400 mt-0.5" aria-hidden="true" />
            <div>
              <span className="text-xs text-gray-500">Nama Bisnis:</span>
              <p className="font-semibold text-gray-900">{organization.name}</p>
              {organization.businessType && (
                <p className="text-xs text-gray-500">{organization.businessType}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="h-4 w-4 text-green-600 mt-0.5" aria-hidden="true" />
            <div>
              <span className="text-xs text-gray-500">Peran Anda:</span>
              <p className="font-bold text-green-700">{organization.role}</p>
              <p className="text-xs text-gray-500">
                Bergabung sejak {formatDate(organization.joinedAt, { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Action */}
      <div className="rounded-xl border border-red-100 bg-red-50/50 p-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-red-900">Keluar dari Akun</h3>
          <p className="text-xs text-red-700 mt-0.5">
            Akhiri sesi Anda pada perangkat ini dengan aman
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer shadow-sm"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Keluar
        </button>
      </div>
    </div>
  );
}
