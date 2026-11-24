import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCategories } from "@/lib/actions/categories";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProductForm } from "@/components/products/ProductForm";

export default async function NewProductPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const categories = await getCategories();

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title="Tambah Produk Baru"
        description="Lengkapi detail produk dagangan Anda di bawah ini"
      />

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
