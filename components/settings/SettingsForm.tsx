"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { UpdateOrganizationSchema } from "@/lib/validations";
import { updateOrganizationSettings } from "@/lib/actions/settings";
import { Loader2, Check } from "lucide-react";
import type { z } from "zod";

type SettingsFormData = z.infer<typeof UpdateOrganizationSchema>;

interface SettingsFormProps {
  initialData: {
    id: string;
    name: string;
    businessType: string | null;
    currency: string;
    timezone: string;
    address: string | null;
    phone: string | null;
    taxRate: number;
    discountRate: number;
    minStockThreshold: number;
    allowNegativeStock: boolean;
    userRole: string;
  };
}

export function SettingsForm({ initialData }: SettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const canEdit = initialData.userRole === "OWNER" || initialData.userRole === "ADMIN";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(UpdateOrganizationSchema),
    defaultValues: {
      name: initialData.name,
      businessType: initialData.businessType ?? "",
      currency: initialData.currency,
      timezone: initialData.timezone,
      phone: initialData.phone ?? "",
      address: initialData.address ?? "",
      taxRate: initialData.taxRate,
      discountRate: initialData.discountRate,
      minStockThreshold: initialData.minStockThreshold,
      allowNegativeStock: initialData.allowNegativeStock,
    },
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    setSuccessMsg(false);

    startTransition(async () => {
      const res = await updateOrganizationSettings(data);
      if (!res.success) {
        setServerError(res.error);
        return;
      }
      setSuccessMsg(true);
      router.refresh();
      setTimeout(() => setSuccessMsg(false), 3000);
    });
  });

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      {serverError && (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {serverError}
        </div>
      )}

      {successMsg && (
        <div role="status" className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700">
          <Check className="h-4 w-4" aria-hidden="true" />
          Pengaturan berhasil disimpan
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
          Identitas Bisnis
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="set-name" className="block text-sm font-medium text-gray-700">
              Nama Usaha / Bisnis <span className="text-red-500">*</span>
            </label>
            <input
              id="set-name"
              type="text"
              {...register("name")}
              disabled={!canEdit || isPending}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="set-type" className="block text-sm font-medium text-gray-700">
              Jenis Usaha
            </label>
            <input
              id="set-type"
              type="text"
              {...register("businessType")}
              placeholder="Contoh: Kuliner / Retail"
              disabled={!canEdit || isPending}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label htmlFor="set-phone" className="block text-sm font-medium text-gray-700">
              Nomor Telepon Toko
            </label>
            <input
              id="set-phone"
              type="tel"
              {...register("phone")}
              placeholder="0812-xxxx-xxxx"
              disabled={!canEdit || isPending}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="set-addr" className="block text-sm font-medium text-gray-700">
              Alamat Lengkap (Ditampilkan di Struk)
            </label>
            <textarea
              id="set-addr"
              rows={2}
              {...register("address")}
              placeholder="Jl. Raya No. 12, Kelurahan..."
              disabled={!canEdit || isPending}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
          Pengaturan Pajak, Diskon & Inventaris
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="set-tax" className="block text-sm font-medium text-gray-700">
              Tarif Pajak PPN (%)
            </label>
            <div className="relative mt-1">
              <input
                id="set-tax"
                type="number"
                step="0.5"
                min="0"
                max="100"
                {...register("taxRate")}
                disabled={!canEdit || isPending}
                className="block w-full rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
              />
              <span className="absolute right-3 top-2 text-sm text-gray-500">%</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">Isi 0 jika usaha Anda non-PKP / bebas pajak</p>
          </div>

          <div>
            <label htmlFor="set-stock" className="block text-sm font-medium text-gray-700">
              Ambang Batas Minimum Stok Default
            </label>
            <input
              id="set-stock"
              type="number"
              min="0"
              {...register("minStockThreshold")}
              disabled={!canEdit || isPending}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-500">Notifikasi akan muncul jika stok produk ≤ nilai ini</p>
          </div>

          <div className="sm:col-span-2 pt-2">
            <div className="flex items-center gap-2">
              <input
                id="set-neg"
                type="checkbox"
                {...register("allowNegativeStock")}
                disabled={!canEdit || isPending}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer disabled:opacity-50"
              />
              <label htmlFor="set-neg" className="text-sm font-medium text-gray-700 cursor-pointer">
                Izinkan Transaksi Saat Stok Habis (Negative Stock)
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500 pl-6">
              Jika tidak dicentang, kasir akan menolak penjualan saat stok produk mencapai 0 untuk mencegah overselling.
            </p>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 cursor-pointer shadow-sm"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      )}
    </form>
  );
}
