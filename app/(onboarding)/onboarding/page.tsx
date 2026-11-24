"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateOrganizationSchema } from "@/lib/validations";
import { createOrganization } from "@/lib/actions/auth";
import { Loader2 } from "lucide-react";
import type { z } from "zod";

type OnboardingInput = z.infer<typeof CreateOrganizationSchema>;

const BUSINESS_TYPES = [
  "Kuliner / Makanan & Minuman",
  "Retail / Toko",
  "Fashion / Pakaian",
  "Elektronik",
  "Pertanian / Peternakan",
  "Jasa / Layanan",
  "Kerajinan / Handmade",
  "Kesehatan & Kecantikan",
  "Lainnya",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(CreateOrganizationSchema),
    defaultValues: { currency: "IDR", timezone: "Asia/Jakarta" },
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createOrganization(data);

      if (!result.success) {
        setServerError(result.error);
        return;
      }

      router.push("/dashboard");
    });
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 text-base font-bold text-white"
            aria-hidden="true"
          >
            U
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Selamat datang!</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Sebelum mulai, beri tahu kami tentang bisnis Anda
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {serverError && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            <div className="space-y-4">
              {/* Nama bisnis */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Nama bisnis <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  aria-invalid={!!errors.name}
                  aria-required="true"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
                  placeholder="Contoh: Toko Berkah Jaya"
                  disabled={isPending}
                />
                {errors.name && (
                  <p id="name-error" className="mt-1.5 text-xs text-red-600" role="alert">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Jenis bisnis */}
              <div>
                <label
                  htmlFor="businessType"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Jenis bisnis
                </label>
                <select
                  id="businessType"
                  {...register("businessType")}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50 cursor-pointer"
                  disabled={isPending}
                >
                  <option value="">Pilih jenis bisnis</option>
                  {BUSINESS_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nomor telepon */}
              <div>
                <label
                  htmlFor="phone"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Nomor telepon bisnis
                </label>
                <input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
                  placeholder="0812-3456-7890"
                  disabled={isPending}
                />
              </div>

              {/* Alamat */}
              <div>
                <label
                  htmlFor="address"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Alamat
                </label>
                <textarea
                  id="address"
                  {...register("address")}
                  rows={2}
                  className="block w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
                  placeholder="Jl. Contoh No. 1, Kota..."
                  disabled={isPending}
                />
              </div>

              {/* Info hidden: mata uang dan timezone sudah defaultnya IDR dan Asia/Jakarta */}
              <input type="hidden" {...register("currency")} value="IDR" />
              <input type="hidden" {...register("timezone")} value="Asia/Jakarta" />

              {/* Info */}
              <p className="rounded-lg bg-green-50 px-3 py-2.5 text-xs text-green-700">
                Mata uang: Rupiah (IDR), Zona waktu: WIB (Asia/Jakarta). Bisa diubah di pengaturan nanti.
              </p>

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {isPending ? "Membuat bisnis..." : "Buat Bisnis dan Mulai"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
