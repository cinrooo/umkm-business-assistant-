"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateProductSchema, type CreateProductInput } from "@/lib/validations";
import { createProduct, updateProduct } from "@/lib/actions/products";
import { Loader2 } from "lucide-react";
import Link from "next/link";

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductFormProps {
  initialData?: {
    id: string;
    name: string;
    sku: string;
    categoryId: string | null;
    description: string | null;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    currentStock?: number;
    minStock: number | null;
    barcode: string | null;
    isActive: boolean;
  };
  categories: CategoryOption[];
  isEdit?: boolean;
}

export function ProductForm({ initialData, categories, isEdit = false }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(CreateProductSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      sku: initialData?.sku ?? "",
      categoryId: initialData?.categoryId ?? "",
      description: initialData?.description ?? "",
      unit: initialData?.unit ?? "pcs",
      costPrice: initialData?.costPrice ?? 0,
      sellingPrice: initialData?.sellingPrice ?? 0,
      currentStock: initialData?.currentStock ?? 0,
      minStock: initialData?.minStock ?? undefined,
      barcode: initialData?.barcode ?? "",
      isActive: initialData?.isActive ?? true,
    },
  });

  const onSubmit = handleSubmit((data) => {
    setServerError(null);
    startTransition(async () => {
      if (isEdit && initialData) {
        const res = await updateProduct(initialData.id, data);
        if (!res.success) {
          setServerError(res.error);
          return;
        }
        router.push(`/products/${initialData.id}`);
        router.refresh();
      } else {
        const res = await createProduct(data);
        if (!res.success) {
          setServerError(res.error);
          return;
        }
        router.push(`/products/${res.data.productId}`);
        router.refresh();
      }
    });
  });

  const generateSku = () => {
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    setValue("sku", `PRD-${random}`);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {serverError && (
        <div role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Nama Produk */}
        <div className="md:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nama Produk <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            {...register("name")}
            placeholder="Contoh: Kopi Susu Gula Aren 250ml"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
            disabled={isPending}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* SKU */}
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
              SKU (Kode Unik Produk) <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={generateSku}
              className="text-xs text-green-600 hover:text-green-700 cursor-pointer"
            >
              Acak SKU
            </button>
          </div>
          <input
            id="sku"
            type="text"
            {...register("sku")}
            placeholder="Contoh: KOP-001"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
            disabled={isPending}
          />
          {errors.sku && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.sku.message}
            </p>
          )}
        </div>

        {/* Kategori */}
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
            Kategori
          </label>
          <select
            id="categoryId"
            {...register("categoryId")}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50 cursor-pointer"
            disabled={isPending}
          >
            <option value="">Pilih Kategori (Opsional)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Harga Modal (HPP) */}
        <div>
          <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700">
            Harga Modal (HPP per unit) <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-2 text-sm text-gray-500">Rp</span>
            <input
              id="costPrice"
              type="number"
              step="100"
              min="0"
              {...register("costPrice")}
              className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
              disabled={isPending}
            />
          </div>
          {errors.costPrice && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.costPrice.message}
            </p>
          )}
        </div>

        {/* Harga Jual */}
        <div>
          <label htmlFor="sellingPrice" className="block text-sm font-medium text-gray-700">
            Harga Jual per unit <span className="text-red-500">*</span>
          </label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-2 text-sm text-gray-500">Rp</span>
            <input
              id="sellingPrice"
              type="number"
              step="100"
              min="0"
              {...register("sellingPrice")}
              className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
              disabled={isPending}
            />
          </div>
          {errors.sellingPrice && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              {errors.sellingPrice.message}
            </p>
          )}
        </div>

        {/* Satuan Unit */}
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
            Satuan Unit
          </label>
          <input
            id="unit"
            type="text"
            {...register("unit")}
            placeholder="pcs, botol, box, kg, porsi"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
            disabled={isPending}
          />
        </div>

        {/* Barcode */}
        <div>
          <label htmlFor="barcode" className="block text-sm font-medium text-gray-700">
            Barcode / EAN (Opsional)
          </label>
          <input
            id="barcode"
            type="text"
            {...register("barcode")}
            placeholder="Nomor barcode scanner jika ada"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
            disabled={isPending}
          />
        </div>

        {/* Stok Awal - hanya saat buat produk baru */}
        {!isEdit && (
          <div>
            <label htmlFor="currentStock" className="block text-sm font-medium text-gray-700">
              Stok Awal
            </label>
            <input
              id="currentStock"
              type="number"
              min="0"
              {...register("currentStock")}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
              disabled={isPending}
            />
            <p className="mt-1 text-xs text-gray-500">
              Akan dicatat otomatis sebagai riwayat stok awal
            </p>
          </div>
        )}

        {/* Batas Minimum Stok */}
        <div>
          <label htmlFor="minStock" className="block text-sm font-medium text-gray-700">
            Batas Minimum Stok (Peringatan)
          </label>
          <input
            id="minStock"
            type="number"
            min="0"
            {...register("minStock")}
            placeholder="Kosongkan untuk memakai pengaturan default bisnis"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
            disabled={isPending}
          />
        </div>

        {/* Status Aktif */}
        <div className="flex items-center gap-2 pt-6">
          <input
            id="isActive"
            type="checkbox"
            {...register("isActive")}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
            disabled={isPending}
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
            Produk Aktif (Tampil dalam pencarian & kasir)
          </label>
        </div>

        {/* Deskripsi */}
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Deskripsi Produk
          </label>
          <textarea
            id="description"
            rows={3}
            {...register("description")}
            placeholder="Keterangan lengkap tentang produk ini..."
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:bg-gray-50"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <Link
          href={isEdit && initialData ? `/products/${initialData.id}` : "/products"}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:opacity-60 cursor-pointer"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isPending ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Tambah Produk"}
        </button>
      </div>
    </form>
  );
}
